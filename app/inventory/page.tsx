'use client'

import { useEffect, useState } from 'react'
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
import { Plus, Edit, Package, AlertTriangle, Search } from 'lucide-react'
import { toast } from 'sonner'
import { getCurrencySymbol } from '@/lib/utils'
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
    const result = await createCategory(shop.id, {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Category created')
      setCategoryDialogOpen(false)
      loadData()
    }
  }

  const lowStockProducts = filteredProducts.filter(p => p.stock_quantity < p.low_stock_threshold)

  if (loading) {
    return (
      <DashboardLayout>
        <InventorySkeleton />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-500 mt-1">Manage products and stock levels</p>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="cursor-pointer">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Category</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateCategory} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cat-name">Name</Label>
                      <Input id="cat-name" name="name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cat-description">Description</Label>
                      <Input id="cat-description" name="description" />
                    </div>
                    <Button type="submit" className="w-full">Create Category</Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingProduct(null)} className="cursor-pointer">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                    <DialogDescription>
                      {editingProduct ? 'Update product details' : 'Add a new product to your inventory'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Product Name *</Label>
                        <Input id="name" name="name" defaultValue={editingProduct?.name} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sku">SKU *</Label>
                        <Input id="sku" name="sku" defaultValue={editingProduct?.sku} required />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input id="description " name="description" defaultValue={editingProduct?.description || ''} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category_id">Category</Label>
                        <Select name="category_id" defaultValue={editingProduct?.category_id || 'none'}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Category</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="barcode">Barcode</Label>
                        <Input id="barcode" name="barcode" defaultValue={editingProduct?.barcode || ''} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price">Selling Price *</Label>
                        <Input
                          id="price"
                          name="price"
                          type="number"
                          step="0.01"
                          defaultValue={editingProduct?.price}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cost">Cost Price</Label>
                        <Input
                          id="cost"
                          name="cost"
                          type="number"
                          step="0.01"
                          defaultValue={editingProduct?.cost || ''}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="stock_quantity">Stock Quantity *</Label>
                        <Input
                          id="stock_quantity"
                          name="stock_quantity"
                          type="number"
                          defaultValue={editingProduct?.stock_quantity || 0}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="low_stock_threshold">Low Stock Alert *</Label>
                        <Input
                          id="low_stock_threshold"
                          name="low_stock_threshold"
                          type="number"
                          defaultValue={editingProduct?.low_stock_threshold || 10}
                          required
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full">
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
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
                Low Stock Alert ({lowStockProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between text-sm">
                    <span>{product.name}</span>
                    <Badge variant="destructive">{product.stock_quantity} left</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Products ({filteredProducts.length}{searchQuery ? ` of ${products.length}` : ''})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead>Actions</TableHead>}
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
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{(product as any).category?.name || '-'}</TableCell>
                    <TableCell>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock: {adjustStockProduct?.name}</DialogTitle>
            <DialogDescription>
              Current stock: {adjustStockProduct?.stock_quantity}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdjustStock} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="change">
                Quantity Change (positive to add, negative to remove)
              </Label>
              <Input id="change" name="change" type="number" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" placeholder="Reason for adjustment" />
            </div>
            <Button type="submit" className="w-full">
              Adjust Stock
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
