'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCurrentShop } from '@/hooks/use-auth'
import {
  getRestaurantTables,
  createRestaurantTable,
  updateRestaurantTable,
  updateTableStatus,
  deleteRestaurantTable,
} from '@/app/actions/tables'
import { RestaurantTable, TableStatus } from '@/types/database.types'
import { Plus, Edit, Trash2, Users, Table2, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { TablesSkeleton } from '@/components/loading-skeletons'

export default function TablesPage() {
  const { shop, loading: authLoading } = useCurrentShop()
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null)
  const [deletingTable, setDeletingTable] = useState<RestaurantTable | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (shop?.id) {
      loadTables()
    }
  }, [shop])

  const loadTables = async () => {
    if (!shop?.id) return
    setLoading(true)
    const { data, error } = await getRestaurantTables(shop.id)
    if (error) {
      toast.error(error)
    } else if (data) {
      setTables(data)
    }
    setLoading(false)
  }

  const handleOpenDialog = (table?: RestaurantTable) => {
    setEditingTable(table || null)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingTable(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!shop?.id) return

    const formData = new FormData(e.currentTarget)
    const tableData = {
      table_number: formData.get('table_number') as string,
      table_name: formData.get('table_name') as string,
      capacity: parseInt(formData.get('capacity') as string) || 4,
      floor_section: formData.get('floor_section') as string,
      notes: formData.get('notes') as string,
    }

    setSubmitting(true)

    let result
    if (editingTable) {
      result = await updateRestaurantTable(editingTable.id, tableData)
    } else {
      result = await createRestaurantTable(shop.id, tableData)
    }

    setSubmitting(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(editingTable ? 'Table updated successfully' : 'Table created successfully')
      handleCloseDialog()
      loadTables()
    }
  }

  const handleDelete = async () => {
    if (!deletingTable) return

    setSubmitting(true)
    const { error } = await deleteRestaurantTable(deletingTable.id)
    setSubmitting(false)

    if (error) {
      toast.error(error)
    } else {
      toast.success('Table deleted successfully')
      setDeleteDialogOpen(false)
      setDeletingTable(null)
      loadTables()
    }
  }

  const handleChangeStatus = async (table: RestaurantTable, newStatus: TableStatus) => {
    const { error } = await updateTableStatus(table.id, newStatus)
    if (error) {
      toast.error(error)
    } else {
      toast.success('Table status updated')
      loadTables()
    }
  }

  const getStatusConfig = (status: TableStatus) => {
    const configs: Record<
      TableStatus,
      { color: string; bgColor: string; icon: any; label: string }
    > = {
      available: {
        color: 'text-green-700',
        bgColor: 'bg-green-100 border-green-300',
        icon: CheckCircle,
        label: 'Available',
      },
      occupied: {
        color: 'text-red-700',
        bgColor: 'bg-red-100 border-red-300',
        icon: Users,
        label: 'Occupied',
      },
      reserved: {
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100 border-yellow-300',
        icon: Clock,
        label: 'Reserved',
      },
      maintenance: {
        color: 'text-gray-700',
        bgColor: 'bg-gray-100 border-gray-300',
        icon: AlertCircle,
        label: 'Maintenance',
      },
    }
    return configs[status]
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <TablesSkeleton />
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

  // Group tables by status
  const tablesByStatus = {
    available: tables.filter((t) => t.status === 'available'),
    occupied: tables.filter((t) => t.status === 'occupied'),
    reserved: tables.filter((t) => t.status === 'reserved'),
    maintenance: tables.filter((t) => t.status === 'maintenance'),
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Restaurant Tables</h1>
            <p className="text-gray-600 mt-1">Manage dining tables and their availability</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Table
          </Button>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Available</p>
                  <p className="text-2xl font-bold">{tablesByStatus.available.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Occupied</p>
                  <p className="text-2xl font-bold">{tablesByStatus.occupied.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Reserved</p>
                  <p className="text-2xl font-bold">{tablesByStatus.reserved.length}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Maintenance</p>
                  <p className="text-2xl font-bold">{tablesByStatus.maintenance.length}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tables Grid */}
        <Card>
          <CardHeader>
            <CardTitle>All Tables ({tables.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {tables.length === 0 ? (
              <div className="text-center py-12">
                <Table2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tables yet</h3>
                <p className="text-gray-600 mb-4">Add your first table to start managing restaurant orders</p>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Table
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tables.map((table) => {
                  const statusConfig = getStatusConfig(table.status)
                  const StatusIcon = statusConfig.icon

                  return (
                    <Card
                      key={table.id}
                      className={`${statusConfig.bgColor} border-2 transition-all hover:shadow-lg min-h-[180px]`}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col h-full">
                          {/* Header */}
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold">{table.table_number}</h3>
                              {table.table_name && (
                                <p className="text-sm text-gray-600">{table.table_name}</p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleOpenDialog(table)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setDeletingTable(table)
                                  setDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="h-3 w-3 text-red-600" />
                              </Button>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="mb-3">
                            <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </div>

                          {/* Info */}
                          <div className="space-y-2 mb-3 flex-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4 text-gray-600" />
                              <span>Capacity: {table.capacity}</span>
                            </div>
                            {table.floor_section && (
                              <div className="flex items-center gap-2 text-sm">
                                <Table2 className="h-4 w-4 text-gray-600" />
                                <span>{table.floor_section}</span>
                              </div>
                            )}
                          </div>

                          {/* Status Actions */}
                          <div className="grid grid-cols-2 gap-1 mt-auto">
                            {table.status !== 'available' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8"
                                onClick={() => handleChangeStatus(table, 'available')}
                              >
                                Available
                              </Button>
                            )}
                            {table.status !== 'occupied' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8"
                                onClick={() => handleChangeStatus(table, 'occupied')}
                              >
                                Occupied
                              </Button>
                            )}
                            {table.status !== 'reserved' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8"
                                onClick={() => handleChangeStatus(table, 'reserved')}
                              >
                                Reserved
                              </Button>
                            )}
                            {table.status !== 'maintenance' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8"
                                onClick={() => handleChangeStatus(table, 'maintenance')}
                              >
                                Maintenance
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTable ? 'Edit Table' : 'Add New Table'}</DialogTitle>
            <DialogDescription>
              {editingTable ? 'Update table information' : 'Add a new table to your restaurant'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="table_number">
                  Table Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="table_number"
                  name="table_number"
                  defaultValue={editingTable?.table_number}
                  required
                  placeholder="T1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="table_name">Table Name</Label>
                <Input
                  id="table_name"
                  name="table_name"
                  defaultValue={editingTable?.table_name}
                  placeholder="Window Table"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">
                  Capacity <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  defaultValue={editingTable?.capacity || 4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="floor_section">Floor/Section</Label>
                <Input
                  id="floor_section"
                  name="floor_section"
                  defaultValue={editingTable?.floor_section}
                  placeholder="Ground Floor"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={editingTable?.notes}
                  placeholder="Additional notes about this table"
                  rows={2}
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
                {submitting ? 'Saving...' : editingTable ? 'Update Table' : 'Add Table'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Table</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete table <strong>{deletingTable?.table_number}</strong>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setDeletingTable(null)
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
              {submitting ? 'Deleting...' : 'Delete Table'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
