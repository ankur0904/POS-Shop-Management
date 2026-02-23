import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Store, ShoppingCart, Package, BarChart3, Users } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect to dashboard if already logged in
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-4">
        <nav className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-2">
            <Store className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">ShopManager</span>
          </div>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>

        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Multi-Tenant POS & Shop Management
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Complete business management solution for retail shops. Manage inventory, process sales, 
            generate invoices, and track analytics - all in one powerful platform.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <ShoppingCart className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Point of Sale</h3>
            <p className="text-gray-600">
              Fast and efficient billing system. Process sales quickly with real-time stock updates.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <Package className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Inventory Management</h3>
            <p className="text-gray-600">
              Track products, manage stock levels, and get low-stock alerts automatically.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <BarChart3 className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Analytics & Reports</h3>
            <p className="text-gray-600">
              Comprehensive sales analytics, revenue tracking, and business insights.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <Users className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Multi-User Access</h3>
            <p className="text-gray-600">
              Role-based permissions for Admin, Cashier, and Inventory Manager.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <Store className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Multi-Tenant</h3>
            <p className="text-gray-600">
              Each shop gets isolated data with complete security and privacy.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <Package className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Invoice Generation</h3>
            <p className="text-gray-600">
              Auto-generate professional invoices for every sale with PDF support.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="bg-blue-600 text-white rounded-2xl p-12 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-xl mb-8 text-blue-100">
              Join hundreds of shops managing their business with ShopManager
            </p>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Create Your Shop Now
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© 2026 ShopManager. Built for hackathon with Next.js & Supabase.</p>
        </div>
      </footer>
    </div>
  )
}

