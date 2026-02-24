'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      // ==============================
      // 1. Clear OLD session + state
      // ==============================
      await supabase.auth.signOut()

      // Clear ALL persisted app state (important for multi-account switch)
      localStorage.removeItem('shop-storage')
      localStorage.removeItem('active_shop_id')
      localStorage.removeItem('user_id')
      localStorage.removeItem('user_email')
      localStorage.removeItem('user_role')

      // ==============================
      // 2. Login
      // ==============================
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const user = data.user
      if (!user) {
        setError('Login failed')
        setLoading(false)
        return
      }

      // ==============================
      // 3. Store User Info
      // ==============================
      localStorage.setItem('user_id', user.id)
      localStorage.setItem('user_email', user.email ?? '')

      // ==============================
      // 4. Fetch user shop
      // ==============================
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('shop_id, role')
        .eq('user_id', user.id)
        .single()

      if (roleError || !roleData) {
        setError('No shop assigned to this user.')
        setLoading(false)
        return
      }

      const shopId = roleData.shop_id
      const role = roleData.role

      // ==============================
      // 5. Store ACTIVE shop
      // ==============================
      localStorage.setItem('active_shop_id', shopId)
      localStorage.setItem('user_role', role)

      console.log('Login successful')
      console.log('User:', user.id)
      console.log('Active Shop:', shopId)

      // ==============================
      // 6. Hard reload to rehydrate Zustand cleanly
      // ==============================
      window.location.href = '/dashboard'

    } catch (err) {
      console.error(err)
      setError('Unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Sign In</CardTitle>
          <CardDescription className="text-center">
            Access your shop dashboard
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input name="email" type="email" required disabled={loading} />
            </div>

            <div>
              <Label>Password</Label>
              <Input name="password" type="password" required disabled={loading} />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span>Don’t have an account? </span>
            <Link href="/register" className="text-blue-600 underline">
              Register
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}