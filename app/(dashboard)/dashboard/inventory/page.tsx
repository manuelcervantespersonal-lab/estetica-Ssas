'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Select } from '@/app/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Plus, Pencil, Trash2, Package, AlertTriangle, TrendingDown } from 'lucide-react'

interface InventoryItem {
  id: string
  product_name: string
  brand: string
  category: string
  current_quantity: number
  min_quantity: number
  supplier: string
  last_purchase_date: string
  created_at: string
}

const categories = [
  { value: 'cabello', label: 'Productos para Cabello' },
  { value: 'unas', label: 'Productos para Uñas' },
  { value: 'facial', label: 'Productos Faciales' },
  { value: 'corporal', label: 'Productos Corporales' },
  { value: 'herramientas', label: 'Herramientas y Equipos' },
  { value: 'consumibles', label: 'Consumibles' },
  { value: 'otro', label: 'Otro' },
]

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showLowStock, setShowLowStock] = useState(false)
  
  const [formData, setFormData] = useState({
  product_name: '',
  brand: '',
  category: 'cabello',
  current_quantity: 0,
  min_quantity: 5,
  supplier: '',
  unit_price: 0,
})

  const supabase = createClient()

  useEffect(() => {
    loadInventory()
  }, [])

  const loadInventory = async () => {
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .order('product_name', { ascending: true })

    if (data) setItems(data)
  }

  const filteredItems = items.filter(item => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false
    if (showLowStock && item.current_quantity > item.min_quantity) return false
    return true
  })

  const lowStockCount = items.filter(item => item.current_quantity <= item.min_quantity).length

 const handleCreate = () => {
  setEditingItem(null)
  setFormData({
    product_name: '',
    brand: '',
    category: 'cabello',
    current_quantity: 0,
    min_quantity: 5,
    supplier: '',
    unit_price: 0,
  })
  setShowModal(true)
}

const handleEdit = (item: InventoryItem) => {
  setEditingItem(item)
  setFormData({
    product_name: item.product_name,
    brand: item.brand || '',
    category: item.category,
    current_quantity: item.current_quantity,
    min_quantity: item.min_quantity,
    supplier: item.supplier || '',
    unit_price: item.unit_price || 0,
  })
  setShowModal(true)
}

  const handleSave = async () => {
    if (!formData.product_name) {
      alert('El nombre del producto es obligatorio')
      return
    }

    if (editingItem) {
      const { error } = await supabase
        .from('inventory')
        .update(formData)
        .eq('id', editingItem.id)

      if (error) {
  console.error('Error al crear:', error)
  console.error('Detalles:', JSON.stringify(error, null, 2))
  alert(`Error al crear el producto: ${error.message}`)
  return
}
    } else {
      const { error } = await supabase
        .from('inventory')
        .insert(formData)

      if (error) {
        console.error('Error al crear:', error)
        alert('Error al crear el producto')
        return
      }
    }

    setShowModal(false)
    loadInventory()
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      await supabase
        .from('inventory')
        .delete()
        .eq('id', id)

      loadInventory()
    }
  }

  const handleAdjustStock = async (item: InventoryItem, adjustment: number) => {
    const newQuantity = Math.max(0, item.current_quantity + adjustment)
    
    await supabase
      .from('inventory')
      .update({ current_quantity: newQuantity })
      .eq('id', item.id)

    loadInventory()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Inventario</h1>
          <p className="text-gray-600">Gestiona tus productos y controla el stock</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Productos
              </CardTitle>
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{items.length}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Stock Bajo
              </CardTitle>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{lowStockCount}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Unidades
              </CardTitle>
              <TrendingDown className="w-5 h-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {items.reduce((sum, item) => sum + item.current_quantity, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3 flex-wrap items-center">
            <Button
              variant={selectedCategory === 'all' ? 'primary' : 'outline'}
              onClick={() => setSelectedCategory('all')}
              size="sm"
            >
              Todos ({items.length})
            </Button>
            {categories.map((cat) => {
              const count = items.filter(i => i.category === cat.value).length
              return (
                <Button
                  key={cat.value}
                  variant={selectedCategory === cat.value ? 'primary' : 'outline'}
                  onClick={() => setSelectedCategory(cat.value)}
                  size="sm"
                >
                  {cat.label} ({count})
                </Button>
              )
            })}
            <div className="ml-auto">
              <Button
                variant={showLowStock ? 'destructive' : 'outline'}
                onClick={() => setShowLowStock(!showLowStock)}
                size="sm"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                {showLowStock ? 'Ver todos' : `Stock bajo (${lowStockCount})`}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de productos */}
      <Card>
        <CardHeader>
          <CardTitle>Productos en Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No hay productos en esta categoría
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Producto</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Marca</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Categoría</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Stock</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Proveedor</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{item.product_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {item.brand || '-'}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600">
                          {categories.find(c => c.value === item.category)?.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAdjustStock(item, -1)}
                          >
                            -
                          </Button>
                          <div className="min-w-[80px] text-center">
                            {item.current_quantity <= item.min_quantity ? (
                              <Badge variant="destructive">
                                {item.current_quantity}
                              </Badge>
                            ) : (
                              <span className="font-semibold">
                                {item.current_quantity}
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAdjustStock(item, 1)}
                          >
                            +
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          Mín: {item.min_quantity}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {item.supplier || '-'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(item)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-bold mb-6">
              {editingItem ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input
                  label="Nombre del Producto *"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  placeholder="Shampoo Keratina"
                />
              </div>

              <Input
                label="Marca"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="L'Oréal"
              />

              <Select
                label="Categoría"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                options={categories}
              />

              <Input
                label="Cantidad Actual"
                type="number"
                value={formData.current_quantity}
                onChange={(e) => setFormData({ ...formData, current_quantity: Number(e.target.value) })}
                min={0}
              />

              <Input
                label="Stock Mínimo"
                type="number"
                value={formData.min_quantity}
                onChange={(e) => setFormData({ ...formData, min_quantity: Number(e.target.value) })}
                min={0}
              />

              <div className="col-span-2">
                <Input
                  label="Proveedor"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Nombre del proveedor"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={handleSave} className="flex-1">
                Guardar
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}