'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCurrentShop } from '@/hooks/use-auth'
import { getPurchases, createPurchase, updatePurchaseStatus, getPurchaseById } from '@/app/actions/purchases'
import { getSuppliers } from '@/app/actions/suppliers'
import { getProducts } from '@/app/actions/products'
import { getTaxRates, getDefaultTaxRate } from '@/app/actions/tax-rates'
import { Purchase, Supplier, Product, TaxRate, PurchaseStatus } from '@/types/database.types'
import {
  Plus,
  Search,
  ShoppingCart,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Trash2,
  Edit,
  Eye,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'
import { PurchasesSkeleton } from '@/components/loading-skeletons'

interface PurchaseItem {
  product_id: string
  product: Product
  quantity: number
  unit_cost: number
}

export default function PurchasesPage() {
  const { shop, loading: authLoading } = useCurrentShop()
  const [purchases, setPurchases] = useState<any[]>([])
  const [filteredPurchases, setFilteredPurchases] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [defaultTaxRate, setDefaultTaxRate] = useState<TaxRate | null>(null)

  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [submitting, setSubmitting] = useState(false)

  // Create PO form state
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const [selectedTaxRateId, setSelectedTaxRateId] = useState<string>('')
  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([])
  const [productSearchQuery, setProductSearchQuery] = useState('')

  useEffect(() => {
    if (shop?.id) {
      loadData()
    }
  }, [shop])

  useEffect(() => {
    filterPurchases()
  }, [searchQuery, statusFilter, purchases])

  const loadData = async () => {
    if (!shop?.id) return
    setLoading(true)

    const [purchasesData, suppliersData, productsData, taxRatesData, defaultTaxData] =
      await Promise.all([
        getPurchases(shop.id),
        getSuppliers(shop.id),
        getProducts(shop.id),
        getTaxRates(shop.id),
        getDefaultTaxRate(shop.id),
      ])

    if (purchasesData.data) setPurchases(purchasesData.data)
    if (suppliersData.data) setSuppliers(suppliersData.data)
    if (productsData.data) setProducts(productsData.data)
    if (taxRatesData.data) {
      setTaxRates(taxRatesData.data)
      if (defaultTaxData.data) {
        setDefaultTaxRate(defaultTaxData.data)
        setSelectedTaxRateId(defaultTaxData.data.id)
      } else if (taxRatesData.data.length > 0) {
        setSelectedTaxRateId(taxRatesData.data[0].id)
      }
    }

    setLoading(false)
  }

  const filterPurchases = () => {
    let filtered = purchases

    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.purchase_order_number.toLowerCase().includes(query) ||
          p.supplier?.name.toLowerCase().includes(query)
      )
    }

    setFilteredPurchases(filtered)
  }

  const handleOpenCreateDialog = () => {
    // Reset form
    setSelectedSupplierId('')
    setOrderDate(new Date().toISOString().split('T')[0])
    setExpectedDeliveryDate('')
    setNotes('')
    setPurchaseItems([])
    setProductSearchQuery('')
    if (defaultTaxRate) {
      setSelectedTaxRateId(defaultTaxRate.id)
    }
    setCreateDialogOpen(true)
  }

  const handleAddProduct = (product: Product) => {
    const existingItem = purchaseItems.find((item) => item.product_id === product.id)
    if (existingItem) {
      toast.error('Product already added')
      return
    }

    const newItem: PurchaseItem = {
      product_id: product.id,
      product: product,
      quantity: 1,
      unit_cost: product.cost_price || product.price || 0,
    }

    setPurchaseItems([...purchaseItems, newItem])
    setProductSearchQuery('')
  }

  const handleUpdateItemQuantity = (productId: string, quantity: number) => {
    setPurchaseItems(
      purchaseItems.map((item) =>
        item.product_id === productId ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    )
  }

  const handleUpdateItemCost = (productId: string, cost: number) => {
    setPurchaseItems(
      purchaseItems.map((item) =>
        item.product_id === productId ? { ...item, unit_cost: Math.max(0, cost) } : item
      )
    )
  }

  const handleRemoveItem = (productId: string) => {
    setPurchaseItems(purchaseItems.filter((item) => item.product_id !== productId))
  }

  const calculateTotals = () => {
    const subtotal = purchaseItems.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)

    const selectedTaxRate = taxRates.find((tr) => tr.id === selectedTaxRateId)
    const cgstPercentage = selectedTaxRate?.cgst_percentage || 0
    const sgstPercentage = selectedTaxRate?.sgst_percentage || 0

    const cgstAmount = (subtotal * cgstPercentage) / 100
    const sgstAmount = (subtotal * sgstPercentage) / 100
    const taxAmount = cgstAmount + sgstAmount
    const totalAmount = subtotal + taxAmount

    return { subtotal, cgstPercentage, sgstPercentage, cgstAmount, sgstAmount, taxAmount, totalAmount }
  }

  const handleCreatePurchase = async () => {
    if (!shop?.id) return

    if (!selectedSupplierId) {
      toast.error('Please select a supplier')
      return
    }

    if (purchaseItems.length === 0) {
      toast.error('Please add at least one product')
      return
    }

    const totals = calculateTotals()

    const purchaseData = {
      supplier_id: selectedSupplierId,
      order_date: orderDate,
      expected_delivery_date: expectedDeliveryDate || undefined,
      items: purchaseItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
      })),
      cgst_percentage: totals.cgstPercentage,
      sgst_percentage: totals.sgstPercentage,
      notes: notes || undefined,
    }

    setSubmitting(true)
    const { data, error } = await createPurchase(shop.id, purchaseData)
    setSubmitting(false)

    if (error) {
      toast.error(error)
    } else {
      toast.success('Purchase order created successfully')
      setCreateDialogOpen(false)
      loadData()
    }
  }

  const handleViewPurchase = async (purchase: any) => {
    const { data, error } = await getPurchaseById(purchase.id)
    if (error) {
      toast.error(error)
    } else {
      setSelectedPurchase(data)
      setDetailDialogOpen(true)
    }
  }

  const handleMarkAsReceived = async () => {
    if (!selectedPurchase) return

    setSubmitting(true)
    const { error } = await updatePurchaseStatus(selectedPurchase.id, 'received')
    setSubmitting(false)

    if (error) {
      toast.error(error)
    } else {
      toast.success('Purchase marked as received. Stock has been updated.')
      setDetailDialogOpen(false)
      loadData()
    }
  }

  const handleCancelPurchase = async () => {
    if (!selectedPurchase) return

    setSubmitting(true)
    const { error } = await updatePurchaseStatus(selectedPurchase.id, 'cancelled')
    setSubmitting(false)

    if (error) {
      toast.error(error)
    } else {
      toast.success('Purchase order cancelled')
      setDetailDialogOpen(false)
      loadData()
    }
  }

  const getStatusBadge = (status: PurchaseStatus) => {
    const variants: Record<PurchaseStatus, { color: string; icon: any }> = {
      draft: { color: 'bg-gray-500', icon: FileText },
      ordered: { color: 'bg-blue-500', icon: Clock },
      received: { color: 'bg-green-500', icon: CheckCircle },
      cancelled: { color: 'bg-red-500', icon: XCircle },
    }

    const variant = variants[status]
    const Icon = variant.icon

    return (
      <Badge className={`${variant.color} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const filteredProductsForSearch = products.filter((p) =>
    p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearchQuery.toLowerCase())
  )

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <PurchasesSkeleton />
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

  const totals = calculateTotals()

  return (
    <DashboardLayout>
      <div className="space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <Button onClick={handleOpenCreateDialog} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create Purchase Order
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by PO number or supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Purchases List */}
        <Card>
          <CardHeader>
            <CardTitle>All Purchase Orders ({filteredPurchases.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPurchases.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery || statusFilter !== 'all' ? 'No purchases found' : 'No purchase orders yet'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first purchase order to manage inventory'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <Button onClick={handleOpenCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Purchase Order
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Order Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPurchases.map((purchase) => (
                        <TableRow key={purchase.id} className="cursor-pointer hover:bg-gray-50">
                          <TableCell className="font-medium">{purchase.purchase_order_number}</TableCell>
                          <TableCell>{purchase.supplier?.name || 'N/A'}</TableCell>
                          <TableCell>
                            {new Date(purchase.order_date).toLocaleDateString('en-IN')}
                          </TableCell>
                          <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{purchase.total_amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewPurchase(purchase)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {filteredPurchases.map((purchase) => (
                    <Card key={purchase.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{purchase.purchase_order_number}</h3>
                            <p className="text-sm text-gray-600">{purchase.supplier?.name || 'N/A'}</p>
                          </div>
                          {getStatusBadge(purchase.status)}
                        </div>

                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">
                            {new Date(purchase.order_date).toLocaleDateString('en-IN')}
                          </span>
                          <span className="font-semibold text-lg">₹{purchase.total_amount.toFixed(2)}</span>
                        </div>

                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => handleViewPurchase(purchase)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Purchase Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>Add products and create a new purchase order</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Supplier & Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Supplier <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Order Date</Label>
                <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Expected Delivery Date</Label>
                <Input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>GST Rate</Label>
                <Select value={selectedTaxRateId} onValueChange={setSelectedTaxRateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select GST rate" />
                  </SelectTrigger>
                  <SelectContent>
                    {taxRates.map((rate) => (
                      <SelectItem key={rate.id} value={rate.id}>
                        {rate.name} - {rate.rate}% (CGST {rate.cgst_percentage}% + SGST{' '}
                        {rate.sgst_percentage}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Selection */}
            <div className="space-y-2">
              <Label>Add Products</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products by name or SKU..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {productSearchQuery && (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {filteredProductsForSearch.slice(0, 10).map((product) => (
                    <div
                      key={product.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                      onClick={() => handleAddProduct(product)}
                    >
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {filteredProductsForSearch.length === 0 && (
                    <div className="p-3 text-center text-gray-500">No products found</div>
                  )}
                </div>
              )}
            </div>

            {/* Selected Products */}
            {purchaseItems.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Products ({purchaseItems.length})</Label>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Cost (₹)</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseItems.map((item) => (
                        <TableRow key={item.product_id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.product.name}</div>
                              <div className="text-xs text-gray-500">SKU: {item.product.sku}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItemQuantity(item.product_id, parseInt(e.target.value) || 1)
                              }
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_cost}
                              onChange={(e) =>
                                handleUpdateItemCost(item.product_id, parseFloat(e.target.value) || 0)
                              }
                              className="w-28"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{(item.quantity * item.unit_cost).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item.product_id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Bill Breakdown */}
            {purchaseItems.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>CGST ({totals.cgstPercentage}%):</span>
                      <span className="font-medium">₹{totals.cgstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>SGST ({totals.sgstPercentage}%):</span>
                      <span className="font-medium">₹{totals.sgstAmount.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Amount:</span>
                      <span>₹{totals.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes for this purchase order..."
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePurchase}
              disabled={submitting || purchaseItems.length === 0}
              className="w-full sm:w-auto"
            >
              {submitting ? 'Creating...' : 'Create Purchase Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedPurchase && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Purchase Order Details</span>
                  {getStatusBadge(selectedPurchase.status)}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">PO Number</Label>
                    <p className="font-semibold">{selectedPurchase.purchase_order_number}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Supplier</Label>
                    <p className="font-semibold">{selectedPurchase.supplier?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Order Date</Label>
                    <p>{new Date(selectedPurchase.order_date).toLocaleDateString('en-IN')}</p>
                  </div>
                  {selectedPurchase.expected_delivery_date && (
                    <div>
                      <Label className="text-gray-600">Expected Delivery</Label>
                      <p>
                        {new Date(selectedPurchase.expected_delivery_date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  )}
                  {selectedPurchase.received_date && (
                    <div>
                      <Label className="text-gray-600">Received Date</Label>
                      <p>{new Date(selectedPurchase.received_date).toLocaleDateString('en-IN')}</p>
                    </div>
                  )}
                </div>

                {/* Line Items */}
                <div>
                  <Label className="text-gray-600">Items</Label>
                  <div className="mt-2 border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Cost</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPurchase.purchase_items?.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.product_name}</div>
                                <div className="text-xs text-gray-500">SKU: {item.product_sku}</div>
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>₹{item.unit_cost.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">
                              ₹{item.subtotal.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Tax Breakdown */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span className="font-medium">₹{selectedPurchase.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>CGST ({selectedPurchase.cgst_percentage}%):</span>
                        <span className="font-medium">₹{selectedPurchase.cgst_amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>SGST ({selectedPurchase.sgst_percentage}%):</span>
                        <span className="font-medium">₹{selectedPurchase.sgst_amount.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total Amount:</span>
                        <span>₹{selectedPurchase.total_amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                {selectedPurchase.notes && (
                  <div>
                    <Label className="text-gray-600">Notes</Label>
                    <p className="mt-1 text-sm">{selectedPurchase.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {selectedPurchase.status === 'ordered' && (
                    <Button onClick={handleMarkAsReceived} disabled={submitting} className="flex-1">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {submitting ? 'Processing...' : 'Mark as Received'}
                    </Button>
                  )}
                  {(selectedPurchase.status === 'draft' || selectedPurchase.status === 'ordered') && (
                    <Button
                      variant="destructive"
                      onClick={handleCancelPurchase}
                      disabled={submitting}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {submitting ? 'Processing...' : 'Cancel Order'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setDetailDialogOpen(false)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
