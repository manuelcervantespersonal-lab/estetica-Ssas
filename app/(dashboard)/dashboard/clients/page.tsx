'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, Search, Pencil, Trash2, Users, TrendingUp, DollarSign, Calendar, X, CreditCard } from 'lucide-react'

interface Client {
  id: string
  cedula: string
  full_name: string
  phone: string
  email: string
  created_at: string
}

const emptyForm = {
  cedula: '',
  full_name: '',
  phone: '',
  email: '',
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => { loadClients() }, [])

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('full_name', { ascending: true })
    if (data) setClients(data)
  }

  const filteredClients = clients.filter(client =>
    client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.cedula?.includes(searchTerm) ||
    client.phone?.includes(searchTerm) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreate = () => {
    setEditingClient(null)
    setFormData(emptyForm)
    setError('')
    setShowModal(true)
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      cedula: client.cedula || '',
      full_name: client.full_name || '',
      phone: client.phone || '',
      email: client.email || '',
    })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setError('')

    // Validaciones — teléfono es opcional
    if (!formData.cedula.trim()) { setError('La cédula es obligatoria'); return }
    if (!formData.full_name.trim()) { setError('El nombre es obligatorio'); return }
    if (!formData.email.trim()) { setError('El correo es obligatorio'); return }

    setSaving(true)

    if (editingClient) {
      const { error } = await supabase
        .from('clients')
        .update({
          cedula: formData.cedula,
          full_name: formData.full_name,
          phone: formData.phone,
          email: formData.email,
        })
        .eq('id', editingClient.id)

      if (error) { setError('Error al actualizar: ' + error.message); setSaving(false); return }
    } else {
      // Verificar cédula duplicada
      const { data: existing } = await supabase
        .from('clients')
        .select('id')
        .eq('cedula', formData.cedula)
        .maybeSingle()

      if (existing) { setError('Ya existe un cliente con esa cédula'); setSaving(false); return }

      const { error } = await supabase
        .from('clients')
        .insert({
          cedula: formData.cedula,
          full_name: formData.full_name,
          phone: formData.phone,
          email: formData.email,
        })

      if (error) { setError('Error al crear: ' + error.message); setSaving(false); return }
    }

    setSaving(false)
    setShowModal(false)
    loadClients()
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este cliente?')) {
      await supabase.from('clients').delete().eq('id', id)
      loadClients()
    }
  }

  const totalClients = clients.length
  const newThisMonth = clients.filter(c => {
    const d = new Date(c.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-1">Administra tu base de clientes</p>
        </div>
        <button onClick={handleCreate}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center gap-2">
          <Plus className="w-5 h-5" strokeWidth={2.5} />
          Nuevo Cliente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Clientes', value: totalClients, icon: <Users className="w-7 h-7 text-white" strokeWidth={2.5} />, color: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/30', border: 'hover:border-purple-200' },
          { label: 'Nuevos este mes', value: newThisMonth, icon: <TrendingUp className="w-7 h-7 text-white" strokeWidth={2.5} />, color: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/30', border: 'hover:border-blue-200' },
          { label: 'Promedio visitas', value: '3.8', icon: <Calendar className="w-7 h-7 text-white" strokeWidth={2.5} />, color: 'from-pink-500 to-rose-500', shadow: 'shadow-pink-500/30', border: 'hover:border-pink-200' },
          { label: 'Gasto promedio', value: '$512', icon: <DollarSign className="w-7 h-7 text-white" strokeWidth={2.5} />, color: 'from-green-500 to-emerald-500', shadow: 'shadow-green-500/30', border: 'hover:border-green-200' },
        ].map((stat, i) => (
          <div key={i} className="group relative">
            <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg ${stat.shadow}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" strokeWidth={2} />
          <input type="text"
            placeholder="Buscar por nombre, cédula, teléfono o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm" />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Todos los Clientes ({filteredClients.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                {['Cliente', 'Cédula', 'Contacto', 'Registro', 'Acciones'].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClients.map(client => (
                <tr key={client.id} className="hover:bg-purple-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-lg flex items-center justify-center shadow-md">
                        <span className="text-white font-bold text-sm">
                          {client.full_name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900">{client.full_name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <CreditCard className="w-4 h-4 text-gray-400" strokeWidth={2} />
                      {client.cedula || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{client.phone || '—'}</p>
                    <p className="text-xs text-gray-500">{client.email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(client.created_at).toLocaleDateString('es-ES', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(client)}
                        className="w-9 h-9 bg-purple-100 hover:bg-purple-200 rounded-lg flex items-center justify-center transition-colors">
                        <Pencil className="w-4 h-4 text-purple-600" strokeWidth={2} />
                      </button>
                      <button onClick={() => handleDelete(client.id)}
                        className="w-9 h-9 bg-red-100 hover:bg-red-200 rounded-lg flex items-center justify-center transition-colors">
                        <Trash2 className="w-4 h-4 text-red-600" strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredClients.length === 0 && (
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-gray-500 font-medium">No se encontraron clientes</p>
              <p className="text-gray-400 text-sm mt-1">Intenta con otro término de búsqueda</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors">
                <X className="w-5 h-5 text-white" strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cédula <span className="text-red-500">*</span>
                </label>
                <input type="text" value={formData.cedula}
                  onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                  placeholder="Ej: 1234567890"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input type="text" value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Ej: María García"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Teléfono <span className="text-gray-400 text-xs font-normal">(opcional)</span>
                </label>
                <input type="tel" value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ej: 3001234567"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Correo Electrónico <span className="text-red-500">*</span>
                </label>
                <input type="email" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Ej: maria@email.com"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm" />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {saving
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando...</>
                  : 'Guardar'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}