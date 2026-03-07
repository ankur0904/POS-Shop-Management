'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { useCurrentShop } from '@/hooks/use-auth'
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '@/app/actions/suppliers'
import { Supplier } from '@/types/database.types'
import { Plus, Search, Edit, Trash2, Building2, Phone, Mail, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { SuppliersSkeleton } from '@/components/loading-skeletons'

export default function SuppliersPage() {
  const { shop, loading: authLoading } = useCurrentShop()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (shop?.id) {
      loadSuppliers()
    }
  }, [shop])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSuppliers(suppliers)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = suppliers.filter(
        (supplier) =>
          supplier.name.toLowerCase().includes(query) ||
          supplier.company_name?.toLowerCase().includes(query) ||
          supplier.phone?.toLowerCase().includes(query) ||
          supplier.email?.toLowerCase().includes(query) ||
          supplier.contact_person?.toLowerCase().includes(query)
      )
      setFilteredSuppliers(filtered)
    }
  }, [searchQuery, suppliers])

  const loadSuppliers = async () => {
    if (!shop?.id) return
    setLoading(true)
    const { data, error } = await getSuppliers(shop.id)
    if (error) {
      toast.error(error)
    } else if (data) {
      setSuppliers(data)
      setFilteredSuppliers(data)
    }
    setLoading(false)
  }

  const handleOpenDialog = (supplier?: Supplier) => {
    setEditingSupplier(supplier || null)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingSupplier(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!shop?.id) return

    const formData = new FormData(e.currentTarget)
    const supplierData = {
      name: formData.get('name') as string,
      company_name: formData.get('company_name') as string,
      contact_person: formData.get('contact_person') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      pincode: formData.get('pincode') as string,
      gst_number: formData.get('gst_number') as string,
      notes: formData.get('notes') as string,
    }

    setSubmitting(true)

    let result
    if (editingSupplier) {
      result = await updateSupplier(editingSupplier.id, supplierData)
    } else {
      result = await createSupplier(shop.id, supplierData)
    }

    setSubmitting(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(editingSupplier ? 'Supplier updated successfully' : 'Supplier created successfully')
      handleCloseDialog()
      loadSuppliers()
    }
  }

  const handleDelete = async () => {
    if (!deletingSupplier) return

    setSubmitting(true)
    const { error } = await deleteSupplier(deletingSupplier.id)
    setSubmitting(false)

    if (error) {
      toast.error(error)
    } else {
      toast.success('Supplier deleted successfully')
      setDeleteDialogOpen(false)
      setDeletingSupplier(null)
      loadSuppliers()
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <SuppliersSkeleton />
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

  return (
    <DashboardLayout>
      <div className="space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold">Suppliers</h1>
          <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search suppliers by name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Suppliers List */}
        <Card>
          <CardHeader>
            <CardTitle>All Suppliers ({filteredSuppliers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSuppliers.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? 'No suppliers found' : 'No suppliers yet'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery
                    ? 'Try adjusting your search terms'
                    : 'Add your first supplier to start managing purchases'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Supplier
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact Person</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>GST Number</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSuppliers.map((supplier) => (
                        <TableRow key={supplier.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{supplier.name}</div>
                              {supplier.company_name && (
                                <div className="text-xs text-gray-500">{supplier.company_name}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{supplier.contact_person || '-'}</TableCell>
                          <TableCell>{supplier.phone || '-'}</TableCell>
                          <TableCell>{supplier.email || '-'}</TableCell>
                          <TableCell>
                            {supplier.gst_number ? (
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {supplier.gst_number}
                              </code>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(supplier)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setDeletingSupplier(supplier)
                                  setDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {filteredSuppliers.map((supplier) => (
                    <Card key={supplier.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{supplier.name}</h3>
                            {supplier.company_name && (
                              <p className="text-sm text-gray-600">{supplier.company_name}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(supplier)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeletingSupplier(supplier)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>

                        {supplier.contact_person && (
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span>{supplier.contact_person}</span>
                          </div>
                        )}

                        {supplier.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span>{supplier.phone}</span>
                          </div>
                        )}

                        {supplier.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="truncate">{supplier.email}</span>
                          </div>
                        )}

                        {supplier.address && (
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                            <span className="text-gray-600">{supplier.address}</span>
                          </div>
                        )}

                        {supplier.gst_number && (
                          <div className="pt-2 border-t">
                            <span className="text-xs text-gray-500">GST Number:</span>
                            <code className="block text-xs bg-gray-100 px-2 py-1 rounded mt-1">
                              {supplier.gst_number}
                            </code>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
            <DialogDescription>
              {editingSupplier
                ? 'Update supplier information'
                : 'Add a new supplier to your directory'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Supplier Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingSupplier?.name}
                  required
                  placeholder="ABC Traders"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  name="company_name"
                  defaultValue={editingSupplier?.company_name}
                  placeholder="ABC Private Limited"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  name="contact_person"
                  defaultValue={editingSupplier?.contact_person}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={editingSupplier?.phone}
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingSupplier?.email}
                  placeholder="contact@abctraders.com"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  defaultValue={editingSupplier?.address}
                  placeholder="Street address"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  defaultValue={editingSupplier?.city}
                  placeholder="Mumbai"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  defaultValue={editingSupplier?.state}
                  placeholder="Maharashtra"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  name="pincode"
                  defaultValue={editingSupplier?.pincode}
                  placeholder="400001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gst_number">GST Number</Label>
                <Input
                  id="gst_number"
                  name="gst_number"
                  defaultValue={editingSupplier?.gst_number}
                  placeholder="22AAAAA0000A1Z5"
                  className="font-mono"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={editingSupplier?.notes}
                  placeholder="Additional notes about this supplier"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Add Supplier'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Supplier</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingSupplier?.name}</strong>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setDeletingSupplier(null)
              }}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              {submitting ? 'Deleting...' : 'Delete Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
