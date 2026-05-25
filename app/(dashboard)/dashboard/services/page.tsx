'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Select } from '@/app/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Plus, Pencil, Trash2, Scissors } from 'lucide-react'

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
  { value: 'cabello', label: 'Cabello' },
  { value: 'uñas', label: 'Uñas' },
  { value: 'facial', label: 'Facial' },
  { value: 'corporal', label: 'Corporal' },
  { value: 'depilacion', label: 'Depilación' },
  { value: 'maquillaje', label: 'Maquillaje' },
]

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
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
    loadServices()
  }, [])

  const loadServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (data) setServices(data)
  }

  // Filtrar por categoría
  const filteredServices = selectedCategory === 'all'
    ? services
    : services.filter(s => s.category === selectedCategory)

  // Agrupar por categoría
  const groupedServices = filteredServices.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = []
    }
    acc[service.category].push(service)
    return acc
  }, {} as Record<string, Service[]>)

  const handleCreate = () => {
    setEditingService(null)
    setFormData({
      name: '',
      description: '',
      duration_minutes: 60,
      price: 0,
      category: 'cabello',
      is_active: true,
    })
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
    console.log('Datos a guardar:', formData)

    if (editingService) {
      const { error } = await supabase
        .from('services')
        .update(formData)
        .eq('id', editingService.id)

      if (error) {
        console.error('Error al actualizar:', error)
        alert('Error al actualizar el servicio')
        return
      }
    } else {
      console.log('Creando nuevo servicio...')
      
      const { data, error } = await supabase
        .from('services')
        .insert(formData)
        .select()
      
      console.log('Respuesta:', { data, error })

      if (error) {
        console.error('Error al crear:', error)
        alert('Error al crear el servicio')
        return
      }
    }

    setShowModal(false)
    loadServices()
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este servicio?')) {
      await supabase
        .from('services')
        .delete()
        .eq('id', id)

      loadServices()
    }
  }

  const toggleActive = async (service: Service) => {
    await supabase
      .from('services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id)

    loadServices()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Servicios</h1>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Servicio
        </Button>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === 'all' ? 'primary' : 'outline'}
              onClick={() => setSelectedCategory('all')}
              size="sm"
            >
              Todos ({services.length})
            </Button>
            {categories.map((cat) => {
              const count = services.filter(s => s.category === cat.value).length
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
          </div>
        </CardContent>
      </Card>

      {/* Servicios por categoría */}
      <div className="space-y-6">
        {Object.entries(groupedServices).map(([category, categoryServices]) => {
          const categoryLabel = categories.find(c => c.value === category)?.label || category

          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-primary" />
                  {categoryLabel}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryServices.map((service) => (
                    <div
                      key={service.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{service.name}</h3>
                        <Badge variant={service.is_active ? 'success' : 'default'}>
                          {service.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{service.description}</p>

                      <div className="flex items-center justify-between text-sm mb-3">
                        <span className="text-gray-600">{service.duration_minutes} min</span>
                        <span className="font-bold text-primary">
                          ${service.price.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(service)}
                          className="flex-1"
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant={service.is_active ? 'outline' : 'primary'}
                          onClick={() => toggleActive(service)}
                        >
                          {service.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(service.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredServices.length === 0 && (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            No hay servicios en esta categoría
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
            </h2>

            <div className="space-y-4">
              <Input
                label="Nombre del Servicio"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Corte de Cabello"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del servicio"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <Select
                label="Categoría"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                options={categories}
              />

              <Input
                label="Duración (minutos)"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                min={15}
                step={15}
              />

              <Input
                label="Precio"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                min={0}
                step={100}
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary rounded"
                />
                <label className="text-sm text-gray-700">Servicio activo</label>
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