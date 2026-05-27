'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, Pencil, Trash2, Clock, DollarSign, X } from 'lucide-react'

interface Service {
  id: string
  name: string
  description: string
  duration_minutes: number
  price: number
  category: string
  is_active: boolean
}

const categories = [
  { value: 'all', label: 'Todos', color: 'from-purple-500 to-fuchsia-500' },
  { value: 'cabello', label: 'Cabello', color: 'from-blue-500 to-cyan-500' },
  { value: 'uñas', label: 'Uñas', color: 'from-pink-500 to-rose-500' },
  { value: 'facial', label: 'Facial', color: 'from-green-500 to-emerald-500' },
  { value: 'corporal', label: 'Corporal', color: 'from-violet-500 to-purple-500' },
  { value: 'depilacion', label: 'Depilación', color: 'from-orange-500 to-red-500' },
  { value: 'maquillaje', label: 'Maquillaje', color: 'from-fuchsia-500 to-pink-500' },
]

const categoryImages: Record<string, string> = {
  cabello: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400&h=300&fit=crop&q=80',
  uñas: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop&q=80',
  facial: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=300&fit=crop&q=80',
  corporal: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop&q=80',
  depilacion: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=400&h=300&fit=crop&q=80',
  maquillaje: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&h=300&fit=crop&q=80',
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [userRole, setUserRole] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_minutes: 60,
    price: 0,
    category: 'cabello',
    is_active: true,
  })

  const supabase = createClient()

  useEffect(() => {
    initialize()
  }, [])

  const initialize = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      if (profile) setUserRole(profile.role)
    }
    loadServices()
  }

  const loadServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })
    if (data) setServices(data)
  }

  const filteredServices = selectedCategory === 'all'
    ? services
    : services.filter(s => s.category === selectedCategory)

  const isReadOnly = userRole === 'cajero'

  const handleCreate = () => {
    setEditingService(null)
    setFormData({ name: '', description: '', duration_minutes: 60, price: 0, category: 'cabello', is_active: true })
    setShowModal(true)
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      description: service.description,
      duration_minutes: service.duration_minutes,
      price: service.price,
      category: service.category,
      is_active: service.is_active,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (editingService) {
      await supabase.from('services').update(formData).eq('id', editingService.id)
    } else {
      await supabase.from('services').insert(formData)
    }
    setShowModal(false)
    loadServices()
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este servicio?')) {
      await supabase.from('services').delete().eq('id', id)
      loadServices()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Servicios</h1>
          <p className="text-gray-600 mt-1">
            {isReadOnly ? 'Consulta los servicios disponibles' : 'Administra los servicios que ofreces'}
          </p>
        </div>
        {!isReadOnly && (
          <button onClick={handleCreate}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center gap-2">
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            Nuevo Servicio
          </button>
        )}
      </div>

      {/* Category Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-8">
        <div className="flex gap-3 flex-wrap">
          {categories.map((cat) => {
            const count = cat.value === 'all' ? services.length : services.filter(s => s.category === cat.value).length
            const isActive = selectedCategory === cat.value
            return (
              <button key={cat.value} onClick={() => setSelectedCategory(cat.value)}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  isActive ? `bg-gradient-to-r ${cat.color} text-white shadow-lg` : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {cat.label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredServices.map((service) => {
          const categoryColor = categories.find(c => c.value === service.category)?.color || 'from-gray-500 to-gray-600'
          const categoryImage = categoryImages[service.category] || categoryImages.facial

          return (
            <div key={service.id}
              className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:border-purple-200 transition-all duration-300">
              
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img src={categoryImage} alt={service.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => { (e.target as HTMLImageElement).src = categoryImages.facial }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${service.is_active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                    {service.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3">
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r ${categoryColor} text-white`}>
                    {categories.find(c => c.value === service.category)?.label}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-1">{service.name}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">{service.description}</p>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" strokeWidth={2} />
                    <span className="text-sm font-medium">{service.duration_minutes} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-5 h-5 text-purple-600" strokeWidth={2.5} />
                    <span className="text-xl font-bold text-gray-900">{service.price.toLocaleString()}</span>
                  </div>
                </div>

                {/* Acciones — solo admin */}
                {!isReadOnly && (
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(service)}
                      className="flex-1 px-4 py-2.5 bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                      <Pencil className="w-4 h-4" strokeWidth={2} />
                      Editar
                    </button>
                    <button onClick={() => handleDelete(service.id)}
                      className="w-11 h-11 bg-red-100 hover:bg-red-200 rounded-xl flex items-center justify-center transition-colors">
                      <Trash2 className="w-4 h-4 text-red-600" strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredServices.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-10 h-10 text-purple-600" strokeWidth={2} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No hay servicios</h3>
          <p className="text-gray-600 mb-6">
            {selectedCategory === 'all' ? 'No hay servicios registrados' : 'No hay servicios en esta categoría'}
          </p>
          {!isReadOnly && (
            <button onClick={handleCreate}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all inline-flex items-center gap-2">
              <Plus className="w-5 h-5" strokeWidth={2.5} />
              Crear Servicio
            </button>
          )}
        </div>
      )}

      {/* Modal — solo admin */}
      {showModal && !isReadOnly && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-5 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-2xl font-bold text-white">
                {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
              </h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors">
                <X className="w-5 h-5 text-white" strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del Servicio</label>
                  <input type="text" value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Corte de Cabello"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                  <textarea value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción del servicio" rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all resize-none" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría</label>
                  <select value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 outline-none transition-all">
                    {categories.filter(c => c.value !== 'all').map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Duración (minutos)</label>
                  <input type="number" value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                    min={15} step={15}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 outline-none transition-all" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Precio</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                    <input type="number" value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      min={0} step={100}
                      className="w-full pl-8 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 outline-none transition-all" />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input type="checkbox" checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-fuchsia-600"></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Servicio activo</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex gap-3 sticky bottom-0">
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