'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, Pencil, Trash2, Package, AlertTriangle, TrendingDown } from 'lucide-react'

interface InventoryItem {
  id: string
  product_name: string
  brand: string
  category: string
  current_quantity: number
  min_quantity: number
  supplier: string
  unit_price?: number
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
  const [userRole, setUserRole] = useState<string>('')
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

  useEffect(() => { initialize() }, [])

  const initialize = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      if (profile) setUserRole(profile.role)
    }
    loadInventory()
  }

  const loadInventory = async () => {
    const { data } = await supabase
      .from('inventory').select('*').order('product_name', { ascending: true })
    if (data) setItems(data)
  }

  const filteredItems = items.filter(item => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false
    if (showLowStock && item.current_quantity > item.min_quantity) return false
    return true
  })

  const lowStockCount = items.filter(item => item.current_quantity <= item.min_quantity).length
  const isReadOnly = userRole === 'cajero'

  const handleCreate = () => {
    setEditingItem(null)
    setFormData({ product_name: '', brand: '', category: 'cabello', current_quantity: 0, min_quantity: 5, supplier: '', unit_price: 0 })
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
    if (!formData.product_name) { alert('El nombre del producto es obligatorio'); return }
    if (editingItem) {
      await supabase.from('inventory').update(formData).eq('id', editingItem.id)
    } else {
      await supabase.from('inventory').insert(formData)
    }
    setShowModal(false)
    loadInventory()
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      await supabase.from('inventory').delete().eq('id', id)
      loadInventory()
    }
  }

  const handleAdjustStock = async (item: InventoryItem, adjustment: number) => {
    const newQuantity = Math.max(0, item.current_quantity + adjustment)
    await supabase.from('inventory').update({ current_quantity: newQuantity }).eq('id', item.id)
    loadInventory()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-600 mt-1">
            {isReadOnly ? 'Consulta el inventario de productos' : 'Gestiona tus productos y controla el stock'}
          </p>
        </div>
        {!isReadOnly && (
          <button onClick={handleCreate}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center gap-2">
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            Nuevo Producto
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Total Productos', value: items.length, icon: <Package className="w-6 h-6 text-white" />, color: 'from-blue-500 to-cyan-500' },
          { label: 'Stock Bajo', value: lowStockCount, icon: <AlertTriangle className="w-6 h-6 text-white" />, color: 'from-red-500 to-rose-500' },
          { label: 'Total Unidades', value: items.reduce((sum, i) => sum + i.current_quantity, 0).toLocaleString(), icon: <TrendingDown className="w-6 h-6 text-white" />, color: 'from-green-500 to-emerald-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-3 items-center">
        <button onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            selectedCategory === 'all' ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}>
          Todos ({items.length})
        </button>
        {categories.map(cat => (
          <button key={cat.value} onClick={() => setSelectedCategory(cat.value)}
            className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              selectedCategory === cat.value ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            {cat.label} ({items.filter(i => i.category === cat.value).length})
          </button>
        ))}
        <button onClick={() => setShowLowStock(!showLowStock)}
          className={`ml-auto px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
            showLowStock ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}>
          <AlertTriangle className="w-4 h-4" />
          {showLowStock ? 'Ver todos' : `Stock bajo (${lowStockCount})`}
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Productos en Inventario ({filteredItems.length})</h3>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" strokeWidth={1.5} />
            <p className="font-medium">No hay productos en esta categoría</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  {['Producto', 'Marca', 'Categoría', 'Stock', 'Stock Mín.', 'Proveedor', !isReadOnly ? 'Acciones' : ''].filter(Boolean).map(h => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map(item => {
                  const isLow = item.current_quantity <= item.min_quantity
                  return (
                    <tr key={item.id} className="hover:bg-purple-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-gray-400" strokeWidth={2} />
                          <p className="font-semibold text-gray-900">{item.product_name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{item.brand || '—'}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {categories.find(c => c.value === item.category)?.label || item.category}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {/* Solo admin puede ajustar stock */}
                          {!isReadOnly && (
                            <button onClick={() => handleAdjustStock(item, -1)}
                              className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center font-bold text-gray-600 transition-colors">
                              -
                            </button>
                          )}
                          <span className={`font-bold text-lg px-2 ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                            {item.current_quantity}
                            {isLow && <AlertTriangle className="w-4 h-4 text-red-500 inline ml-1" />}
                          </span>
                          {!isReadOnly && (
                            <button onClick={() => handleAdjustStock(item, 1)}
                              className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center font-bold text-gray-600 transition-colors">
                              +
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{item.min_quantity}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{item.supplier || '—'}</td>
                      {!isReadOnly && (
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEdit(item)}
                              className="w-9 h-9 bg-purple-100 hover:bg-purple-200 rounded-lg flex items-center justify-center transition-colors">
                              <Pencil className="w-4 h-4 text-purple-700" strokeWidth={2} />
                            </button>
                            <button onClick={() => handleDelete(item.id)}
                              className="w-9 h-9 bg-red-100 hover:bg-red-200 rounded-lg flex items-center justify-center transition-colors">
                              <Trash2 className="w-4 h-4 text-red-600" strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal — solo admin */}
      {showModal && !isReadOnly && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-5 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold text-white">
                {editingItem ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors text-white font-bold text-lg">
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del Producto *</label>
                  <input type="text" value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    placeholder="Shampoo Keratina"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-300 outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Marca</label>
                  <input type="text" value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="L'Oréal"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-300 outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría</label>
                  <select value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-300 outline-none transition-all">
                    {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cantidad Actual</label>
                  <input type="number" value={formData.current_quantity}
                    onChange={(e) => setFormData({ ...formData, current_quantity: Number(e.target.value) })}
                    min={0}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-300 outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Stock Mínimo</label>
                  <input type="number" value={formData.min_quantity}
                    onChange={(e) => setFormData({ ...formData, min_quantity: Number(e.target.value) })}
                    min={0}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-300 outline-none transition-all" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Proveedor</label>
                  <input type="text" value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Nombre del proveedor"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-300 outline-none transition-all" />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex gap-3 rounded-b-2xl">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}