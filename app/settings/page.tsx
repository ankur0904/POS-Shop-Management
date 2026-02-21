'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { updateShopSettings, updateUserPassword, updateUserEmail, getShopSettings } from '@/app/actions/settings'
import { useAuth, useCurrentShop } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'
import { SettingsSkeleton } from '@/components/loading-skeletons'
import { useTheme } from 'next-themes'

export default function SettingsPage() {
  const { user } = useAuth()
  const { refreshShopData } = useCurrentShop()
  const { theme, setTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Business Settings State
  const [businessSettings, setBusinessSettings] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    tax_id: '',
    currency: 'USD'
  })

  // Profile Settings State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')

  // Load shop settings
  useEffect(() => {
    async function loadSettings() {
      setLoading(true)
      const result = await getShopSettings()
      if (result.success && result.data) {
        setBusinessSettings({
          name: result.data.name || '',
          address: result.data.address || '',
          phone: result.data.phone || '',
          email: result.data.email || '',
          tax_id: result.data.tax_id || '',
          currency: result.data.currency || 'USD'
        })
      }
      setLoading(false)
    }
    loadSettings()
  }, [])

  const handleBusinessSettingsSave = async () => {
    setSaving(true)
    try {
      const result = await updateShopSettings(businessSettings)
      if (result.success) {
        toast.success('Business settings updated successfully')
        // Refresh the shop data in the store
        if (refreshShopData) {
          await refreshShopData()
        }
        // Reload the settings to ensure consistency
        const updatedSettings = await getShopSettings()
        if (updatedSettings.success && updatedSettings.data) {
          setBusinessSettings({
            name: updatedSettings.data.name || '',
            address: updatedSettings.data.address || '',
            phone: updatedSettings.data.phone || '',
            email: updatedSettings.data.email || '',
            tax_id: updatedSettings.data.tax_id || '',
            currency: updatedSettings.data.currency || 'USD'
          })
        }
      } else {
        toast.error(result.error || 'Failed to update settings')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setSaving(true)
    try {
      const result = await updateUserPassword(currentPassword, newPassword)
      if (result.success) {
        toast.success('Password updated successfully')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(result.error || 'Failed to update password')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleEmailChange = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setSaving(true)
    try {
      const result = await updateUserEmail(newEmail)
      if (result.success) {
        toast.success(result.message || 'Email update initiated')
        setNewEmail('')
      } else {
        toast.error(result.error || 'Failed to update email')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <SettingsSkeleton />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 lg:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account and business settings</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4 lg:space-y-6">
          <TabsList className="grid grid-cols-3 w-full sm:inline-flex sm:w-auto sm:justify-start">
            <TabsTrigger value="profile" className="text-xs sm:text-sm sm:flex-none">Profile</TabsTrigger>
            <TabsTrigger value="business" className="text-xs sm:text-sm sm:flex-none">Business</TabsTrigger>
            <TabsTrigger value="preferences" className="text-xs sm:text-sm sm:flex-none">Preferences</TabsTrigger>
          </TabsList>

          {/* Profile Settings Tab */}
          <TabsContent value="profile" className="space-y-4 lg:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Account Information</CardTitle>
                <CardDescription className="text-xs sm:text-sm">View your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Current Email</Label>
                  <Input value={user?.email || ''} disabled />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Change Email</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Update your email address (requires verification)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-email" className="text-sm">New Email Address</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email"
                  />
                </div>
                <Button onClick={handleEmailChange} disabled={saving || !newEmail} className="text-sm">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Email
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Change Password</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password" className="text-sm">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
                <Button
                  onClick={handlePasswordChange}
                  disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                  className="text-sm"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Business Settings Tab */}
          <TabsContent value="business" className="space-y-4 lg:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Business Information</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Manage your business details and tax information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business-name">Business Name *</Label>
                    <Input
                      id="business-name"
                      value={businessSettings.name}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, name: e.target.value })}
                      placeholder="Enter business name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-phone">Phone Number</Label>
                    <Input
                      id="business-phone"
                      value={businessSettings.phone}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, phone: e.target.value })}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business-address">Business Address</Label>
                  <Input
                    id="business-address"
                    value={businessSettings.address}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, address: e.target.value })}
                    placeholder="Enter business address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business-email">Business Email</Label>
                    <Input
                      id="business-email"
                      type="email"
                      value={businessSettings.email}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, email: e.target.value })}
                      placeholder="Enter business email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax-id">Tax ID / GST Number</Label>
                    <Input
                      id="tax-id"
                      value={businessSettings.tax_id}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, tax_id: e.target.value })}
                      placeholder="Enter tax ID"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={businessSettings.currency}
                    onValueChange={(value) => setBusinessSettings({ ...businessSettings, currency: value })}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="AUD">AUD (A$)</SelectItem>
                      <SelectItem value="CAD">CAD (C$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleBusinessSettingsSave} disabled={saving || !businessSettings.name}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Business Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Application Preferences</CardTitle>
                <CardDescription>Customize your application experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger id="theme">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">Choose your preferred theme</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notifications">Notifications</Label>
                  <Select defaultValue="all">
                    <SelectTrigger id="notifications">
                      <SelectValue placeholder="Select notification preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Notifications</SelectItem>
                      <SelectItem value="important">Important Only</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">Notification settings coming soon</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date-format">Date Format</Label>
                  <Select defaultValue="MM/DD/YYYY">
                    <SelectTrigger id="date-format">
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">Date format customization coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
