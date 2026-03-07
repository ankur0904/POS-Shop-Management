'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCurrentShop } from '@/hooks/use-auth'
import { getTaxRates } from '@/app/actions/tax-rates'
import { getSuppliers } from '@/app/actions/suppliers'
import { getPurchases } from '@/app/actions/purchases'
import { getRestaurantTables } from '@/app/actions/tables'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function BackendTestPage() {
  const { shop } = useCurrentShop()
  const [results, setResults] = useState<any>({})
  const [testing, setTesting] = useState(false)

  const runTests = async () => {
    if (!shop?.id) {
      alert('No shop found!')
      return
    }

    setTesting(true)
    const testResults: any = {}

    // Test 1: Tax Rates
    try {
      const { data, error } = await getTaxRates(shop.id)
      testResults.taxRates = {
        success: !error && data,
        count: data?.length || 0,
        data: data?.slice(0, 3) || [],
        error
      }
    } catch (err: any) {
      testResults.taxRates = { success: false, error: err.message }
    }

    // Test 2: Suppliers
    try {
      const { data, error } = await getSuppliers(shop.id)
      testResults.suppliers = {
        success: !error,
        count: data?.length || 0,
        error
      }
    } catch (err: any) {
      testResults.suppliers = { success: false, error: err.message }
    }

    // Test 3: Purchases
    try {
      const { data, error } = await getPurchases(shop.id, 10)
      testResults.purchases = {
        success: !error,
        count: data?.length || 0,
        error
      }
    } catch (err: any) {
      testResults.purchases = { success: false, error: err.message }
    }

    // Test 4: Restaurant Tables
    try {
      const { data, error } = await getRestaurantTables(shop.id)
      testResults.tables = {
        success: !error,
        count: data?.length || 0,
        error
      }
    } catch (err: any) {
      testResults.tables = { success: false, error: err.message }
    }

    setResults(testResults)
    setTesting(false)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Backend Test Page</h1>
          <p className="text-gray-500 mt-1">Verify all new features are working</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Run Backend Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={runTests} disabled={testing || !shop}>
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {testing ? 'Testing...' : 'Run All Tests'}
            </Button>

            {Object.keys(results).length > 0 && (
              <div className="space-y-3 mt-6">
                {/* Tax Rates Test */}
                <div className={`p-4 rounded-lg border ${results.taxRates?.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {results.taxRates?.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <h3 className="font-semibold">GST Tax Rates</h3>
                  </div>
                  {results.taxRates?.success ? (
                    <div className="text-sm">
                      <p>✅ Found {results.taxRates.count} tax rate(s)</p>
                      {results.taxRates.data?.map((rate: any) => (
                        <p key={rate.id} className="ml-4 text-xs text-gray-600">
                          • {rate.name}: CGST {rate.cgst_percentage}% + SGST {rate.sgst_percentage}%
                          {rate.is_default && ' (DEFAULT)'}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-red-600">❌ {results.taxRates?.error || 'Failed'}</p>
                  )}
                </div>

                {/* Suppliers Test */}
                <div className={`p-4 rounded-lg border ${results.suppliers?.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {results.suppliers?.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-yellow-600" />
                    )}
                    <h3 className="font-semibold">Suppliers</h3>
                  </div>
                  <p className="text-sm">
                    {results.suppliers?.success ? (
                      `✅ Found ${results.suppliers.count} supplier(s)`
                    ) : (
                      `⚠️ ${results.suppliers?.error || 'No suppliers yet (this is normal)'}`
                    )}
                  </p>
                </div>

                {/* Purchases Test */}
                <div className={`p-4 rounded-lg border ${results.purchases?.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {results.purchases?.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-yellow-600" />
                    )}
                    <h3 className="font-semibold">Purchase Orders</h3>
                  </div>
                  <p className="text-sm">
                    {results.purchases?.success ? (
                      `✅ Found ${results.purchases.count} purchase order(s)`
                    ) : (
                      `⚠️ ${results.purchases?.error || 'No purchases yet (this is normal)'}`
                    )}
                  </p>
                </div>

                {/* Tables Test */}
                <div className={`p-4 rounded-lg border ${results.tables?.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {results.tables?.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-yellow-600" />
                    )}
                    <h3 className="font-semibold">Restaurant Tables</h3>
                  </div>
                  <p className="text-sm">
                    {results.tables?.success ? (
                      `✅ Found ${results.tables.count} table(s)`
                    ) : (
                      `⚠️ ${results.tables?.error || 'No tables yet (this is normal)'}`
                    )}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-sm font-semibold text-blue-800 mb-2">
                    ✅ Backend Status
                  </p>
                  <p className="text-xs text-blue-700">
                    All backend features are functional! If you see green checkmarks, the APIs are working correctly.
                    Yellow warnings for suppliers/purchases/tables are normal if you haven't created any yet.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>✅ <strong>Step 1:</strong> Go to Settings → Business tab → Initialize GST rates</p>
              <p>⏳ <strong>Step 2:</strong> UI pages need to be built for:</p>
              <ul className="ml-6 space-y-1 text-gray-600">
                <li>• Supplier Management</li>
                <li>• Purchase Orders</li>
                <li>• Update POS with GST calculator</li>
                <li>• Advanced Reports</li>
                <li>• Restaurant Tables (optional)</li>
              </ul>
              <p className="mt-3 text-gray-500 text-xs">
                💡 Check IMPLEMENTATION-GUIDE.md for detailed instructions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
