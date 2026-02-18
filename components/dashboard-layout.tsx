'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Settings,
  LogOut,
  Store,
  Menu,
  X
} from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { useAuth, useCurrentShop } from '@/hooks/use-auth'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'POS', href: '/pos', icon: ShoppingCart },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Sales', href: '/sales', icon: BarChart3 },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const { shop, role } = useCurrentShop()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-sidebar border-b border-gray-200 dark:border-sidebar-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-blue-600 dark:text-sidebar-primary" />
            <div>
              <h1 className="font-bold text-base text-gray-900 dark:text-sidebar-foreground">ShopManager</h1>
              {shop && (
                <p className="text-xs text-gray-500 dark:text-sidebar-foreground/60 truncate max-w-[150px]">{shop.name}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-sidebar border-r border-gray-200 dark:border-sidebar-border transition-transform duration-300 ease-in-out",
        "lg:translate-x-0",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full pt-16 lg:pt-0">
          {/* Logo - Desktop Only */}
          <div className="hidden lg:flex items-center gap-2 px-6 py-4 border-b border-gray-200 dark:border-sidebar-border">
            <Store className="h-8 w-8 text-blue-600 dark:text-sidebar-primary" />
            <div>
              <h1 className="font-bold text-lg text-gray-900 dark:text-sidebar-foreground">ShopManager</h1>
              {shop && (
                <p className="text-xs text-gray-500 dark:text-sidebar-foreground/60 truncate">{shop.name}</p>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-600 dark:bg-sidebar-accent dark:text-sidebar-accent-foreground'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-sidebar-foreground dark:hover:bg-sidebar-accent/50 dark:hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200 dark:border-sidebar-border">
            <div className="flex items-center gap-3 mb-3">
              <Avatar>
                <AvatarFallback>
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-sidebar-foreground truncate">
                  {user?.email}
                </p>
                {role && (
                  <p className="text-xs text-gray-500 dark:text-sidebar-foreground/60 capitalize">{role}</p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2 cursor-pointer" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-16 lg:pt-0 lg:pl-64">
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
