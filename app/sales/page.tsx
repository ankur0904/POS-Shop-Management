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
import { Search, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getSaleById } from '@/app/actions/sales'
import { getCurrencySymbol } from '@/lib/utils'
import { SalesSkeleton } from '@/components/loading-skeletons'

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
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Recent Transactions</CardTitle>
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Sale Details - {selectedSale?.invoice_number}</DialogTitle>
            </DialogHeader>
            {selectedSale && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Date</p>
                    <p className="font-medium">
                      {format(new Date(selectedSale.created_at), 'PPpp')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Customer</p>
                    <p className="font-medium">{selectedSale.customer_name || 'Walk-in Customer'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Payment Method</p>
                    <p className="font-medium capitalize">{selectedSale.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <Badge variant={selectedSale.status === 'completed' ? 'default' : 'destructive'}>
                      {selectedSale.status}
                    </Badge>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Items</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSale.sale_items?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.product_name}</p>
                              <p className="text-xs text-gray-500">{item.product_sku}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {getCurrencySymbol(shop.currency)} {Number(item.unit_price).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {getCurrencySymbol(shop.currency)} {Number(item.subtotal).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{getCurrencySymbol(shop.currency)} {Number(selectedSale.subtotal).toFixed(2)}</span>
                  </div>
                  {selectedSale.tax_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tax</span>
                      <span>{getCurrencySymbol(shop.currency)} {Number(selectedSale.tax_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {selectedSale.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{getCurrencySymbol(shop.currency)} {Number(selectedSale.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
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
