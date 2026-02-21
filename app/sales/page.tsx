'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useCurrentShop } from '@/hooks/use-auth'
import { getSales } from '@/app/actions/sales'
import { Sale } from '@/types/database.types'
import { Search, Eye, FileSpreadsheet } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getSaleById } from '@/app/actions/sales'
import { getCurrencySymbol, exportToCSV } from '@/lib/utils'
import { SalesSkeleton } from '@/components/loading-skeletons'
import { toast } from 'sonner'

export default function SalesPage() {
  const { shop } = useCurrentShop()
  const [sales, setSales] = useState<any[]>([])
  const [filteredSales, setFilteredSales] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedSale, setSelectedSale] = useState<any>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)

  useEffect(() => {
    if (shop) {
      loadSales()
    }
  }, [shop])

  useEffect(() => {
    if (searchQuery) {
      const filtered = sales.filter(
        (s) =>
          s.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredSales(filtered)
    } else {
      setFilteredSales(sales)
    }
  }, [searchQuery, sales])

  const loadSales = async () => {
    if (!shop) return

    setLoading(true)
    const { data } = await getSales(shop.id, 100)
    if (data) {
      setSales(data)
      setFilteredSales(data)
    }
    setLoading(false)
  }

  const handleViewSale = async (saleId: string) => {
    const { data } = await getSaleById(saleId)
    if (data) {
      setSelectedSale(data)
      setViewDialogOpen(true)
    }
  }

  const handleExportCSV = () => {
    if (filteredSales.length === 0) {
      toast.error('No data to export')
      return
    }

    const columns = [
      { key: 'invoice_number' as const, label: 'Invoice Number' },
      { key: 'date' as const, label: 'Date' },
      { key: 'customer_name' as const, label: 'Customer' },
      { key: 'items_count' as const, label: 'Items' },
      { key: 'payment_method' as const, label: 'Payment Method' },
      { key: 'subtotal' as const, label: 'Subtotal' },
      { key: 'tax_amount' as const, label: 'Tax' },
      { key: 'discount_amount' as const, label: 'Discount' },
      { key: 'total_amount' as const, label: 'Total Amount' },
      { key: 'status' as const, label: 'Status' },
    ]

    // Format data for export
    const exportData = filteredSales.map(sale => ({
      invoice_number: sale.invoice_number,
      date: format(new Date(sale.created_at), 'yyyy-MM-dd HH:mm:ss'),
      customer_name: sale.customer_name || 'Walk-in',
      items_count: sale.sale_items?.length || 0,
      payment_method: sale.payment_method,
      subtotal: Number(sale.subtotal).toFixed(2),
      tax_amount: Number(sale.tax_amount || 0).toFixed(2),
      discount_amount: Number(sale.discount_amount || 0).toFixed(2),
      total_amount: Number(sale.total_amount).toFixed(2),
      status: sale.status,
    }))

    // Generate filename
    const today = new Date()
    const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`
    const filterSuffix = searchQuery ? `-${searchQuery.replace(/[^a-zA-Z0-9]/g, '_')}` : ''
    const filename = `sales${filterSuffix}-${dateStr}`

    exportToCSV(exportData, filename, columns)
    toast.success('Sales data exported successfully')
  }

  if (loading || !shop) {
    return (
      <DashboardLayout>
        <SalesSkeleton />
      </DashboardLayout>
    )
  }

  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total_amount), 0)

  return (
    <DashboardLayout>
      <div className="space-y-4 lg:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sales History</h1>
          <p className="text-sm text-gray-500 mt-1">View all transactions and invoices</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Total Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{sales.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {getCurrencySymbol(shop.currency)} {totalRevenue.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Average Sale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {getCurrencySymbol(shop.currency)} {sales.length ? (totalRevenue / sales.length).toFixed(2) : '0.00'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by invoice number or customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sales Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base sm:text-lg">Recent Transactions</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportCSV}
              className="cursor-pointer h-8 w-8 p-0"
              title="Download as CSV"
            >
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="min-w-[768px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Invoice #</TableHead>
                  <TableHead className="text-xs sm:text-sm">Date</TableHead>
                  <TableHead className="text-xs sm:text-sm">Customer</TableHead>
                  <TableHead className="text-xs sm:text-sm">Items</TableHead>
                  <TableHead className="text-xs sm:text-sm">Payment</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Amount</TableHead>
                  <TableHead className="text-center text-xs sm:text-sm">Status</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      No sales found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-xs sm:text-sm">{sale.invoice_number}</TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {format(new Date(sale.created_at), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">{sale.customer_name || 'Walk-in'}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{sale.sale_items?.length || 0}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {sale.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs sm:text-sm">
                        {getCurrencySymbol(shop.currency)} {Number(sale.total_amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={sale.status === 'completed' ? 'default' : 'destructive'}
                          className="capitalize text-xs"
                        >
                          {sale.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="cursor-pointer"
                          onClick={() => handleViewSale(sale.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* View Sale Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Sale Details - {selectedSale?.invoice_number}</DialogTitle>
            </DialogHeader>
            {selectedSale && (
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Date</p>
                    <p className="font-medium text-sm">
                      {format(new Date(selectedSale.created_at), 'PPpp')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Customer</p>
                    <p className="font-medium text-sm">{selectedSale.customer_name || 'Walk-in Customer'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Payment Method</p>
                    <p className="font-medium text-sm capitalize">{selectedSale.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Status</p>
                    <Badge variant={selectedSale.status === 'completed' ? 'default' : 'destructive'} className="text-xs">
                      {selectedSale.status}
                    </Badge>
                  </div>
                </div>

                <div className="border-t pt-3 sm:pt-4">
                  <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Items</h3>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[400px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Product</TableHead>
                          <TableHead className="text-center text-xs">Qty</TableHead>
                          <TableHead className="text-right text-xs">Price</TableHead>
                          <TableHead className="text-right text-xs">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSale.sale_items?.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-xs sm:text-sm">
                              <div>
                                <p className="font-medium">{item.product_name}</p>
                                <p className="text-xs text-gray-500">{item.product_sku}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-xs sm:text-sm">{item.quantity}</TableCell>
                            <TableCell className="text-right text-xs sm:text-sm">
                              {getCurrencySymbol(shop.currency)} {Number(item.unit_price).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-xs sm:text-sm">
                              {getCurrencySymbol(shop.currency)} {Number(item.subtotal).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="border-t pt-3 sm:pt-4 space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{getCurrencySymbol(shop.currency)} {Number(selectedSale.subtotal).toFixed(2)}</span>
                  </div>
                  {selectedSale.tax_amount > 0 && (
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-500">Tax</span>
                      <span>{getCurrencySymbol(shop.currency)} {Number(selectedSale.tax_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {selectedSale.discount_amount > 0 && (
                    <div className="flex justify-between text-xs sm:text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{getCurrencySymbol(shop.currency)} {Number(selectedSale.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base sm:text-lg font-bold border-t pt-2">
                    <span>Total</span>
                    <span>{getCurrencySymbol(shop.currency)} {Number(selectedSale.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
