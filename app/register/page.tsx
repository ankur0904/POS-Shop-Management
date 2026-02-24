'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setLoading(true)

    const fullName = formData.get('fullName') as string
    const shopName = formData.get('shopName') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      // =========================
      // 1. Sign up user (NO EMAIL CONFIRMATION)
      // =========================
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const user = data.user
      if (!user) {
        setError('User creation failed')
        setLoading(false)
        return
      }

      // =========================
      // 2. Create Shop
      // =========================
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .insert({
          name: shopName,
          slug: shopName.toLowerCase().replace(/\s+/g, '-'),
          owner_id: user.id,
          currency: 'INR',
        })
        .select()
        .single()

      if (shopError || !shop) {
        setError('Shop creation failed')
        setLoading(false)
        return
      }

      // =========================
      // 3. Create user role (admin)
      // =========================
      await supabase.from('user_roles').insert({
        shop_id: shop.id,
        user_id: user.id,
        role: 'admin',
      })

      // =========================
      // 4. Store local session info
      // =========================
      localStorage.removeItem('shop-storage')

      localStorage.setItem('user_id', user.id)
      localStorage.setItem('user_email', email)
      localStorage.setItem('active_shop_id', shop.id)
      localStorage.setItem('user_role', 'admin')

      console.log('User + Shop created')

      // =========================
      // 5. Redirect
      // =========================
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
          <CardTitle className="text-2xl text-center">Create Account</CardTitle>
          <CardDescription className="text-center">
            Register your shop and start managing your business
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input name="fullName" required disabled={loading} />
            </div>

            <div>
              <Label>Shop Name</Label>
              <Input name="shopName" required disabled={loading} />
            </div>

            <div>
              <Label>Email</Label>
              <Input name="email" type="email" required disabled={loading} />
            </div>

            <div>
              <Label>Password</Label>
              <Input name="password" type="password" minLength={6} required disabled={loading} />
            </div>

            <div>
              <Label>Confirm Password</Label>
              <Input name="confirmPassword" type="password" minLength={6} required disabled={loading} />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span>Already have an account? </span>
            <Link href="/login" className="text-blue-600 underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}