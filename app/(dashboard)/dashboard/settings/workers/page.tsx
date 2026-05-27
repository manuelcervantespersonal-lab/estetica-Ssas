'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Plus, Search, Edit, UserX, UserCheck,
  X, Save, Users, Phone, CreditCard,
  CheckCircle2, AlertCircle, Eye, EyeOff
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Worker {
  id: string
  cedula: string
  nombres: string
  apellidos: string
  full_name: string
  telefono: string
  role: string
  is_active: boolean
  hire_date: string
}

const ROLES = [
  { value: 'estilista', label: 'Esteticista', color: 'bg-purple-100 text-purple-700' },
  { value: 'cajero', label: 'Recepción / Cajero', color: 'bg-blue-100 text-blue-700' },
  { value: 'admin', label: 'Administrador', color: 'bg-red-100 text-red-700' },
]

const emptyForm = {
  cedula: '',
  nombres: '',
  apellidos: '',
  telefono: '',
  email: '',
  password: '',
  role: 'estilista',
  hire_date: new Date().toISOString().split('T')[0],
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('active')
  const [showModal, setShowModal] = useState(false)
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const supabase = createClient()

  useEffect(() => { initialize() }, [])

  const initialize = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') { window.location.href = '/dashboard'; return }
    await loadWorkers()
    setLoading(false)
  }

  const loadWorkers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, cedula, nombres, apellidos, full_name, telefono, role, is_active, hire_date')
      .order('apellidos', { ascending: true })
    if (data) setWorkers(data as Worker[])
  }

  const handleOpenCreate = () => {
    setEditingWorker(null)
    setForm(emptyForm)
    setError('')
    setShowPassword(false)
    setShowModal(true)
  }

  const handleOpenEdit = (worker: Worker) => {
    setEditingWorker(worker)
    setForm({
      cedula: worker.cedula || '',
      nombres: worker.nombres || '',
      apellidos: worker.apellidos || '',
      telefono: worker.telefono || '',
      email: '',
      password: '',
      role: worker.role || 'estilista',
      hire_date: worker.hire_date || new Date().toISOString().split('T')[0],
    })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setError('')

    if (!form.cedula || !form.nombres || !form.apellidos || !form.telefono) {
      setError('Cédula, nombres, apellidos y teléfono son obligatorios')
      return
    }

    if (!editingWorker && (!form.email || !form.password)) {
      setError('Email y contraseña son obligatorios')
      return
    }

    if (!editingWorker && form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setSaving(true)

    try {
      if (editingWorker) {
        // EDITAR empleado existente
        const { error } = await supabase
          .from('profiles')
          .update({
            cedula: form.cedula,
            nombres: form.nombres,
            apellidos: form.apellidos,
            full_name: `${form.nombres} ${form.apellidos}`,
            telefono: form.telefono,
            role: form.role,
            hire_date: form.hire_date,
          })
          .eq('id', editingWorker.id)

        if (error) { setError('Error al actualizar: ' + error.message); setSaving(false); return }
        alert(`✅ ${form.nombres} ${form.apellidos} actualizado correctamente`)

      } else {
        // CREAR nuevo empleado con auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              full_name: `${form.nombres} ${form.apellidos}`,
              role: form.role
            }
          }
        })

        if (authError) { setError('Error: ' + authError.message); setSaving(false); return }
        if (!authData.user) { setError('No se pudo crear el usuario'); setSaving(false); return }

        // Guardar datos completos en profiles
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            cedula: form.cedula,
            nombres: form.nombres,
            apellidos: form.apellidos,
            full_name: `${form.nombres} ${form.apellidos}`,
            telefono: form.telefono,
            role: form.role,
            hire_date: form.hire_date,
            is_active: true,
            available: true
          })

        if (profileError) { setError('Error guardando datos: ' + profileError.message); setSaving(false); return }
        alert(`✅ ${form.nombres} ${form.apellidos} creado. Ya puede ingresar al sistema con su email y contraseña.`)
      }

      await loadWorkers()
      setShowModal(false)
    } catch (err: any) {
      setError('Error inesperado: ' + err.message)
    }

    setSaving(false)
  }

  const handleToggleActive = async (worker: Worker) => {
    const action = worker.is_active ? 'desactivar' : 'activar'
    if (!confirm(`¿Deseas ${action} a ${worker.full_name}?`)) return

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !worker.is_active })
      .eq('id', worker.id)

    if (!error) {
      await loadWorkers()
      alert(`✅ Trabajador ${worker.is_active ? 'desactivado' : 'activado'}`)
    }
  }

  const getRoleConfig = (role: string) => ROLES.find(r => r.value === role) || ROLES[0]

  const filtered = workers.filter(w => {
    const matchSearch =
      w.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.cedula?.includes(searchTerm) ||
      w.telefono?.includes(searchTerm)
    const matchRole = filterRole === 'all' || w.role === filterRole
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? w.is_active : !w.is_active)
    return matchSearch && matchRole && matchStatus
  })

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Empleados</h1>
          <p className="text-gray-600 mt-1">Gestiona el equipo de trabajo</p>
        </div>
        <button onClick={handleOpenCreate}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center gap-2">
          <Plus className="w-5 h-5" strokeWidth={2.5} />
          Nuevo Empleado
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: workers.length, color: 'from-purple-500 to-fuchsia-500' },
          { label: 'Activos', value: workers.filter(w => w.is_active).length, color: 'from-green-500 to-emerald-500' },
          { label: 'Esteticistas', value: workers.filter(w => w.role === 'estilista').length, color: 'from-violet-500 to-purple-500' },
          { label: 'Recepción', value: workers.filter(w => w.role === 'cajero').length, color: 'from-blue-500 to-cyan-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
              <Users className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1 relative min-w-48">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" strokeWidth={2} />
          <input
            type="text"
            placeholder="Buscar por nombre, cédula o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none text-sm transition-all"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'estilista', 'cajero', 'admin'].map(role => (
            <button key={role} onClick={() => setFilterRole(role)}
              className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                filterRole === role
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              {role === 'all' ? 'Todos' : role === 'estilista' ? 'Esteticistas' : role === 'cajero' ? 'Recepción' : 'Admin'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {[{ value: 'active', label: '✅ Activos' }, { value: 'inactive', label: '❌ Inactivos' }, { value: 'all', label: 'Todos' }].map(s => (
            <button key={s.value} onClick={() => setFilterStatus(s.value)}
              className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                filterStatus === s.value ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="font-bold text-gray-900">{filtered.length} empleado{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-gray-500 font-medium">No se encontraron empleados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  {['Empleado', 'Cédula', 'Teléfono', 'Rol', 'Fecha Ingreso', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(worker => {
                  const roleConfig = getRoleConfig(worker.role)
                  return (
                    <tr key={worker.id} className={`hover:bg-purple-50/50 transition-colors ${!worker.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                            <span className="text-white font-bold text-sm">
                              {worker.nombres?.charAt(0)}{worker.apellidos?.charAt(0)}
                            </span>
                          </div>
                          <p className="font-bold text-gray-900">{worker.nombres} {worker.apellidos}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <CreditCard className="w-4 h-4 text-gray-400" strokeWidth={2} />
                          {worker.cedula || '—'}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <Phone className="w-4 h-4 text-gray-400" strokeWidth={2} />
                          {worker.telefono || '—'}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${roleConfig.color}`}>
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {worker.hire_date
                          ? format(new Date(worker.hire_date), 'd MMM yyyy', { locale: es })
                          : '—'}
                      </td>
                      <td className="px-5 py-4">
                        {worker.is_active
                          ? <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-lg w-fit">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                            </span>
                          : <span className="flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-100 px-3 py-1 rounded-lg w-fit">
                              <AlertCircle className="w-3.5 h-3.5" /> Inactivo
                            </span>
                        }
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleOpenEdit(worker)}
                            className="w-9 h-9 bg-purple-100 hover:bg-purple-200 rounded-lg flex items-center justify-center transition-colors"
                            title="Editar">
                            <Edit className="w-4 h-4 text-purple-700" strokeWidth={2} />
                          </button>
                          <button onClick={() => handleToggleActive(worker)}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                              worker.is_active ? 'bg-red-100 hover:bg-red-200' : 'bg-green-100 hover:bg-green-200'
                            }`}
                            title={worker.is_active ? 'Desactivar' : 'Activar'}>
                            {worker.is_active
                              ? <UserX className="w-4 h-4 text-red-700" strokeWidth={2} />
                              : <UserCheck className="w-4 h-4 text-green-700" strokeWidth={2} />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">

            <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-5 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editingWorker ? 'Editar Empleado' : 'Nuevo Empleado'}
                </h2>
                <p className="text-purple-100 text-sm mt-0.5">
                  {editingWorker ? editingWorker.full_name : 'Completa todos los datos'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors">
                <X className="w-5 h-5 text-white" strokeWidth={2} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              <div className="space-y-5">

                {error && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" strokeWidth={2} />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Datos Personales */}
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Datos Personales</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Nombres *</label>
                      <input type="text" value={form.nombres}
                        onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                        placeholder="Ej: María Camila"
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Apellidos *</label>
                      <input type="text" value={form.apellidos}
                        onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                        placeholder="Ej: López García"
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cédula *</label>
                      <input type="text" value={form.cedula}
                        onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                        placeholder="Ej: 1234567890"
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono *</label>
                      <input type="tel" value={form.telefono}
                        onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                        placeholder="Ej: 3001234567"
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha de Ingreso</label>
                      <input type="date" value={form.hire_date}
                        onChange={(e) => setForm({ ...form, hire_date: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Rol *</label>
                      <select value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm">
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Acceso al sistema - solo al crear */}
                {!editingWorker && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Acceso al Sistema</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                        <input type="email" value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="correo@ejemplo.com"
                          className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña *</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm pr-12" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 shrink-0">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {saving
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando...</>
                  : <><Save className="w-5 h-5" strokeWidth={2} /> {editingWorker ? 'Guardar Cambios' : 'Crear Empleado'}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}