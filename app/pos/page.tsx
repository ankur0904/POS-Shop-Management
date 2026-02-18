'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useCurrentShop } from '@/hooks/use-auth'
import { useCartStore } from '@/lib/store/cart-store'
import { getProducts } from '@/app/actions/products'
import { createSale } from '@/app/actions/sales'
import { Product, PaymentMethod } from '@/types/database.types'
import { Search, Plus, Minus, Trash2, ShoppingBag, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { generateReceipt } from '@/lib/generate-receipt'
import { getCurrencySymbol } from '@/lib/utils'

export default function POSPage() {
  const { shop } = useCurrentShop()
  const { items, addItem, removeItem, updateQuantity, clearCart, getTotal } = useCartStore()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [processing, setProcessing] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [sendReceipt, setSendReceipt] = useState(false)
  const [lastSaleData, setLastSaleData] = useState<any>(null)

  useEffect(() => {
    if (shop) {
      loadProducts()
    }
  }, [shop])

  useEffect(() => {
    if (searchQuery) {
      const filtered = products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredProducts(filtered)
    } else {
      setFilteredProducts(products)
    }
  }, [searchQuery, products])

  const loadProducts = async () => {
    if (!shop) return

    const { data, error } = await getProducts(shop.id)
    if (data) {
      setProducts(data)
      setFilteredProducts(data)
    }
  }

  const handleAddToCart = (product: Product) => {
    if (product.stock_quantity <= 0) {
      toast.error('Product out of stock')
      return
    }

    const existingItem = items.find((item) => item.product.id === product.id)
    if (existingItem && existingItem.quantity >= product.stock_quantity) {
      toast.error('Cannot add more than available stock')
      return
    }

    addItem(product)
    toast.success(`${product.name} added to cart`)
  }

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty')
      return
    }

    if (sendReceipt && !customerPhone) {
      toast.error('Please enter customer phone number to send receipt')
      return
    }

    if (!shop) return

    setProcessing(true)

    try {
      const saleItems = items.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        productSku: item.product.sku,
        quantity: item.quantity,
        unitPrice: item.product.price,
      }))

      const { data, error } = await createSale({
        shopId: shop.id,
        items: saleItems,
        paymentMethod,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
      })

      if (error) {
        toast.error(error)
        return
      }

      toast.success('Sale completed successfully!')

      // Save sale data for receipt generation
      if (sendReceipt && data) {
        setLastSaleData({
          shop,
          sale: data,
          items: items,
          customerName,
          customerPhone,
          paymentMethod,
        })
      }

      clearCart()
      setCustomerName('')
      setCustomerPhone('')
      setSendReceipt(false)
      setSearchQuery('')
      loadProducts() // Refresh stock
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete sale')
    } finally {
      setProcessing(false)
    }
  }

  const handleShareReceipt = async () => {
    if (!lastSaleData) return

    try {
      const pdfBlob = await generateReceipt(lastSaleData)
      const file = new File([pdfBlob], `receipt-${lastSaleData.sale.invoice_number}.pdf`, {
        type: 'application/pdf',
      })

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Receipt - ${lastSaleData.sale.invoice_number}`,
          text: `Thank you for your purchase at ${lastSaleData.shop.name}!`,
          files: [file],
        })
        toast.success('Receipt shared successfully!')
        setLastSaleData(null)
      } else {
        // Fallback: download the PDF
        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `receipt-${lastSaleData.sale.invoice_number}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Receipt downloaded!')
        setLastSaleData(null)
      }
    } catch (error: any) {
      toast.error('Failed to share receipt: ' + error.message)
    }
  }

  const total = getTotal()

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6 lg:h-[calc(100vh-8rem)]">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-3 lg:space-y-4 lg:overflow-hidden lg:flex lg:flex-col">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Point of Sale</h1>
            <p className="text-sm text-muted-foreground mt-1">Quick billing and checkout</p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search by name, SKU, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Products Grid */}
          <div className="lg:flex-1 lg:overflow-y-auto max-h-[400px] lg:max-h-none">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 lg:gap-4 pb-4">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleAddToCart(product)}
                >
                  <CardContent className="p-3 lg:p-4">
                    <h3 className="font-medium text-xs sm:text-sm truncate">{product.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{product.sku}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-xs sm:text-sm text-blue-600">
                        {getCurrencySymbol(shop?.currency)} {product.price.toFixed(2)}
                      </span>
                      <Badge
                        variant={product.stock_quantity > 0 ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {product.stock_quantity}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <div className="bg-card rounded-lg border border-border p-4 lg:p-6 flex flex-col lg:sticky lg:top-4">
          <h2 className="text-lg lg:text-xl font-bold mb-3 lg:mb-4 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 lg:h-5 lg:w-5" />
            Cart ({items.length})
          </h2>

          {/* Customer Info */}
          <div className="space-y-2 lg:space-y-3 mb-3 lg:mb-4">
            <Input
              placeholder="Customer Name (Optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder={sendReceipt ? "Customer Phone (Required)" : "Customer Phone (Optional)"}
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              required={sendReceipt}
              className="text-sm"
            />
            {/* <div className="flex items-center space-x-2">
              <Checkbox
                id="send-receipt"
                checked={sendReceipt}
                onCheckedChange={(checked) => setSendReceipt(checked as boolean)}
              />
              <Label
                htmlFor="send-receipt"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Send receipt to customer?
              </Label>
            </div> */}
          </div>

          <Separator className="my-3 lg:my-4" />

          {/* Cart Items */}
          <div className="flex-1 lg:overflow-y-auto space-y-2 lg:space-y-3 max-h-[300px] lg:max-h-none">
            {items.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 lg:py-12">
                <ShoppingBag className="h-8 w-8 lg:h-12 lg:w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Cart is empty</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.product.id} className="flex items-center gap-2 pb-2 lg:pb-3 border-b">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getCurrencySymbol(shop?.currency)} {item.product.price.toFixed(2)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-1 lg:gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-6 w-6 lg:h-7 lg:w-7"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 lg:w-8 text-center font-medium text-xs lg:text-sm">{item.quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-6 w-6 lg:h-7 lg:w-7"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock_quantity}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 lg:h-7 lg:w-7 text-red-500"
                      onClick={() => removeItem(item.product.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals */}
          <div className="space-y-2 lg:space-y-3 mt-3 lg:mt-4">
            <Separator />
            <div className="flex justify-between text-base lg:text-lg font-bold">
              <span>Total</span>
              <span>
                {getCurrencySymbol(shop?.currency)} {total.toFixed(2)}
              </span>
            </div>

            {/* Payment Method */}
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="digital">Digital Payment</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => clearCart()} disabled={items.length === 0} className="text-sm">
                Clear
              </Button>
              <Button
                onClick={handleCheckout}
                disabled={items.length === 0 || processing}
                className="bg-blue-600 hover:bg-blue-700 text-sm"
              >
                {processing ? 'Processing...' : 'Checkout'}
              </Button>
            </div>

            {/* Share Receipt Button */}
            {lastSaleData && (
              <Button
                onClick={handleShareReceipt}
                variant="outline"
                className="w-full mt-2 border-green-600 text-green-600 hover:bg-green-50 text-sm"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Receipt
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
