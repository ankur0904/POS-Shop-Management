'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useCurrentShop } from '@/hooks/use-auth'
import { getProducts, getCategories, createProduct, updateProduct, adjustStock, createCategory } from '@/app/actions/products'
import { Product, Category } from '@/types/database.types'
import { Plus, Edit, Package, AlertTriangle, Search, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { getCurrencySymbol, exportToCSV } from '@/lib/utils'
import { InventorySkeleton } from '@/components/loading-skeletons'

export default function InventoryPage() {
  const { shop, role } = useCurrentShop()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [adjustStockProduct, setAdjustStockProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const canEdit = role === 'admin' || role === 'inventory_manager'

  useEffect(() => {
    if (shop) {
      loadData()
    }
  }, [shop])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = products.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query) ||
          (product.barcode && product.barcode.toLowerCase().includes(query))
      )
      setFilteredProducts(filtered)
    }
  }, [searchQuery, products])

  const loadData = async () => {
    if (!shop) return

    setLoading(true)
    try {
      const [productsData, categoriesData] = await Promise.all([
        getProducts(shop.id),
        getCategories(shop.id),
      ])

      if (productsData.data) setProducts(productsData.data)
      if (categoriesData.data) setCategories(categoriesData.data)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!shop || !canEdit) return

    const formData = new FormData(e.currentTarget)

    const categoryId = formData.get('category_id') as string
    const productData = {
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      description: formData.get('description') as string,
      category_id: categoryId && categoryId !== 'none' ? categoryId : undefined,
      price: parseFloat(formData.get('price') as string),
      cost: parseFloat(formData.get('cost') as string) || undefined,
      stock_quantity: parseInt(formData.get('stock_quantity') as string),
      low_stock_threshold: parseInt(formData.get('low_stock_threshold') as string),
      barcode: formData.get('barcode') as string || undefined,
    }

    let result
    if (editingProduct) {
      result = await updateProduct(editingProduct.id, productData)
    } else {
      result = await createProduct(shop.id, productData)
    }

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(editingProduct ? 'Product updated' : 'Product created')
      setDialogOpen(false)
      setEditingProduct(null)
      loadData()
    }
  }

  const handleAdjustStock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!shop || !adjustStockProduct) return

    const formData = new FormData(e.currentTarget)
    const change = parseInt(formData.get('change') as string)
    const notes = formData.get('notes') as string

    const result = await adjustStock(shop.id, adjustStockProduct.id, change, notes)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Stock adjusted successfully')
      setAdjustStockProduct(null)
      loadData()
    }
  }

  const handleCreateCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!shop || !canEdit) return

    const formData = new FormData(e.currentTarget)
    const categoryData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
    }

    // DEBUG START
    const supabase = createClient()
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    const { data: userData, error: userError } = await supabase.auth.getUser()

    const payload = {
      shop_id: shop.id,
      ...categoryData
    }

    const { data: insertResult, error: insertError } = await supabase
      .from("categories")
      .insert(payload)
      .select()

    const debug = {
      SESSION: sessionData,
      SESSION_ERROR: sessionError,
      USER: userData,
      USER_ERROR: userError,
      JWT: sessionData?.session?.access_token,
      INSERT_PAYLOAD: payload,
      INSERT_RESULT: insertResult,
      INSERT_ERROR: insertError,
      SHOP_ID_USED: shop.id,
      IS_LOGGED__BEFORE_INSERT: !!userData?.user
    }

    console.log("DEBUG_DATA:", JSON.stringify(debug, null, 2))
    setDebugInfo(debug)
    // DEBUG END

    if (insertError) {
      toast.error(insertError.message)
    } else {
      toast.success('Category created')
      setCategoryDialogOpen(false)
      loadData()
    }
  }

  const lowStockProducts = filteredProducts.filter(p => p.stock_quantity < p.low_stock_threshold)

  const handleExportCSV = () => {
    if (filteredProducts.length === 0) {
      toast.error('No data to export')
      return
    }

    const columns = [
      { key: 'name' as const, label: 'Product Name' },
      { key: 'sku' as const, label: 'SKU' },
      { key: 'barcode' as const, label: 'Barcode' },
      { key: 'price' as const, label: 'Price' },
      { key: 'cost' as const, label: 'Cost' },
      { key: 'stock_quantity' as const, label: 'Stock Quantity' },
      { key: 'low_stock_threshold' as const, label: 'Low Stock Threshold' },
    ]

    // Format data for export
    const exportData = filteredProducts.map(product => ({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      category: (product as any).category?.name || '',
      price: product.price,
      cost: product.cost || '',
      stock_quantity: product.stock_quantity,
      low_stock_threshold: product.low_stock_threshold,
    }))

    // Add category column
    const columnsWithCategory = [
      { key: 'name' as const, label: 'Product Name' },
      { key: 'sku' as const, label: 'SKU' },
      { key: 'barcode' as const, label: 'Barcode' },
      { key: 'category' as const, label: 'Category' },
      { key: 'price' as const, label: 'Price' },
      { key: 'cost' as const, label: 'Cost' },
      { key: 'stock_quantity' as const, label: 'Stock Quantity' },
      { key: 'low_stock_threshold' as const, label: 'Low Stock Threshold' },
    ]

    // Generate filename
    const today = new Date()
    const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`
    const filterSuffix = searchQuery ? `-${searchQuery.replace(/[^a-zA-Z0-9]/g, '_')}` : ''
    const filename = `inventory${filterSuffix}-${dateStr}`

    exportToCSV(exportData, filename, columnsWithCategory)
    toast.success('Inventory exported successfully')
  }

  if (loading) {
    return (
      <DashboardLayout>
        <InventorySkeleton />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 lg:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage products and stock levels</p>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="cursor-pointer text-sm">
                    <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Add </span>Category
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] sm:w-full max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">Create Category</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateCategory} className="space-y-3 sm:space-y-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="cat-name" className="text-sm">Name</Label>
                      <Input id="cat-name" name="name" required className="text-sm" />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="cat-description" className="text-sm">Description</Label>
                      <Input id="cat-description" name="description" className="text-sm" />
                    </div>
                    <Button type="submit" className="w-full text-sm sm:text-base mt-4">Create Category</Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingProduct(null)} className="cursor-pointer text-sm">
                    <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Add </span>Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
                  <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                      {editingProduct ? 'Update product details' : 'Add a new product to your inventory'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="name" className="text-sm">Product Name *</Label>
                        <Input id="name" name="name" defaultValue={editingProduct?.name} required className="text-sm" />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="sku" className="text-sm">SKU *</Label>
                        <Input id="sku" name="sku" defaultValue={editingProduct?.sku} required className="text-sm" />
                      </div>
                    </div>

                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="description" className="text-sm">Description</Label>
                      <Input id="description " name="description" defaultValue={editingProduct?.description || ''} className="text-sm" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="category_id" className="text-sm">Category</Label>
                        <Select name="category_id" defaultValue={editingProduct?.category_id || 'none'}>
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-sm">No Category</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id} className="text-sm">
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="barcode" className="text-sm">Barcode</Label>
                        <Input id="barcode" name="barcode" defaultValue={editingProduct?.barcode || ''} className="text-sm" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="price" className="text-sm">Selling Price *</Label>
                        <Input
                          id="price"
                          name="price"
                          type="number"
                          step="0.01"
                          defaultValue={editingProduct?.price}
                          required
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="cost" className="text-sm">Cost Price</Label>
                        <Input
                          id="cost"
                          name="cost"
                          type="number"
                          step="0.01"
                          defaultValue={editingProduct?.cost || ''}
                          className="text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="stock_quantity" className="text-sm">Stock Quantity *</Label>
                        <Input
                          id="stock_quantity"
                          name="stock_quantity"
                          type="number"
                          defaultValue={editingProduct?.stock_quantity || 0}
                          required
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="low_stock_threshold" className="text-sm">Low Stock Alert *</Label>
                        <Input
                          id="low_stock_threshold"
                          name="low_stock_threshold"
                          type="number"
                          defaultValue={editingProduct?.low_stock_threshold || 10}
                          required
                          className="text-sm"
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full text-sm sm:text-base mt-4">
                      {editingProduct ? 'Update Product' : 'Create Product'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by product name, SKU, or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700 text-base sm:text-lg">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                Low Stock Alert ({lowStockProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="truncate mr-2">{product.name}</span>
                    <Badge variant="destructive" className="text-xs">{product.stock_quantity} left</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base sm:text-lg">Products ({filteredProducts.length}{searchQuery ? ` of ${products.length}` : ''})</CardTitle>
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
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">SKU</TableHead>
                  <TableHead className="text-xs sm:text-sm">Name</TableHead>
                  <TableHead className="text-xs sm:text-sm">Category</TableHead>
                  <TableHead className="text-xs sm:text-sm">Price</TableHead>
                  <TableHead className="text-xs sm:text-sm">Stock</TableHead>
                  <TableHead className="text-xs sm:text-sm">Status</TableHead>
                  {canEdit && <TableHead className="text-xs sm:text-sm">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 7 : 6} className="text-center py-8 text-gray-500">
                      {searchQuery ? 'No products found matching your search.' : 'No products yet. Add your first product!'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-xs sm:text-sm">{product.sku}</TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm">{product.name}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{(product as any).category?.name || '-'}</TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {getCurrencySymbol(shop?.currency)} {product.price.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            product.stock_quantity === 0
                              ? 'destructive'
                              : product.stock_quantity < product.low_stock_threshold
                                ? 'default'
                                : 'secondary'
                          }
                        >
                          {product.stock_quantity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {product.stock_quantity === 0 ? (
                          <Badge variant="destructive">Out of Stock</Badge>
                        ) : product.stock_quantity < product.low_stock_threshold ? (
                          <Badge className="bg-orange-500">Low Stock</Badge>
                        ) : (
                          <Badge variant="secondary">In Stock</Badge>
                        )}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="cursor-pointer"
                              onClick={() => {
                                setEditingProduct(product)
                                setDialogOpen(true)
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="cursor-pointer"
                              onClick={() => setAdjustStockProduct(product)}
                            >
                              <Package className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Adjust Stock Dialog */}
      <Dialog open={!!adjustStockProduct} onOpenChange={() => setAdjustStockProduct(null)}>
        <DialogContent className="w-[95vw] sm:w-full max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Adjust Stock: {adjustStockProduct?.name}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Current stock: {adjustStockProduct?.stock_quantity}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdjustStock} className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="change" className="text-sm">
                Quantity Change (+ add, - remove)
              </Label>
              <Input id="change" name="change" type="number" required className="text-sm" />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="notes" className="text-sm">Notes</Label>
              <Input id="notes" name="notes" placeholder="Reason for adjustment" className="text-sm" />
            </div>
            <Button type="submit" className="w-full text-sm sm:text-base mt-4">
              Adjust Stock
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* DEBUG DISPLAY */}
      {debugInfo && (
        <div id="debug-output" style={{ display: 'none' }}>
          {JSON.stringify(debugInfo)}
        </div>
      )}
    </DashboardLayout>
  )
}
