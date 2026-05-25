'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, ChevronLeft, ChevronRight, X, Clock, User, Calendar as CalendarIcon } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns'
import { es } from 'date-fns/locale'

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  status: string
  notes: string
  client_id: string
  service_id: string
  employee_id: string
  clients: { full_name: string; phone: string }
  services: { name: string; duration_minutes: number; price: number }
  profiles: { full_name: string }
}

interface Client {
  id: string
  full_name: string
}

interface Service {
  id: string
  name: string
  duration_minutes: number
  price: number
}

interface Stylist {
  id: string
  full_name: string
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [stylists, setStylists] = useState<Stylist[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')
  
  const [filterService, setFilterService] = useState<string>('all')
  const [filterEmployee, setFilterEmployee] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  
  const [formData, setFormData] = useState({
    clientId: '',
    serviceId: '',
    employeeId: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '',
    notes: '',
  })

  const supabase = createClient()

  useEffect(() => {
    initialize()
  }, [])

  const initialize = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      window.location.href = '/login'
      return
    }

    setUserId(user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile) {
      setUserRole(profile.role)
    }

    await Promise.all([
      loadAppointments(),
      loadClients(),
      loadServices(),
      loadStylists(),
    ])
  }

  const loadAppointments = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    let query = supabase
      .from('appointments')
      .select(`
        *,
        clients(full_name, phone),
        services(name, duration_minutes, price),
        profiles!appointments_employee_id_fkey(full_name)
      `)

    if (profile?.role === 'estilista') {
      query = query.eq('employee_id', user.id)
    }

    const { data } = await query
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })

    if (data) setAppointments(data as any)
  }

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, full_name')
      .order('full_name', { ascending: true })

    if (data) setClients(data)
  }

  const loadServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, name, duration_minutes, price')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (data) setServices(data)
  }

  const loadStylists = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'estilista')
      .eq('available', true)
      .order('full_name', { ascending: true })

    if (data) setStylists(data)
  }

  const handleCreateAppointment = async () => {
    if (!formData.clientId || !formData.serviceId || !formData.appointmentTime) {
      alert('Por favor completa todos los campos obligatorios')
      return
    }

    let employeeId = formData.employeeId
    if (userRole === 'estilista') {
      employeeId = userId!
    }

    if (!employeeId) {
      alert('Debes seleccionar una estilista')
      return
    }

    const { error } = await supabase
      .from('appointments')
      .insert({
        client_id: formData.clientId,
        service_id: formData.serviceId,
        employee_id: employeeId,
        appointment_date: formData.appointmentDate,
        appointment_time: formData.appointmentTime,
        notes: formData.notes,
        status: 'pending',
        assigned_by: userId,
      })

    if (error) {
      alert(`Error: ${error.message}`)
      return
    }

    setShowModal(false)
    setFormData({
      clientId: '',
      serviceId: '',
      employeeId: '',
      appointmentDate: new Date().toISOString().split('T')[0],
      appointmentTime: '',
      notes: '',
    })
    
    await loadAppointments()
  }

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId)

    loadAppointments()
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      confirmed: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
      no_show: 'bg-gray-100 text-gray-700 border-gray-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      completed: 'Completada',
      cancelled: 'Cancelada',
      no_show: 'No llegó',
    }
    return labels[status] || status
  }

  // Calendario
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Obtener el día de la semana del primer día (0 = domingo)
  const firstDayOfWeek = monthStart.getDay()
  const emptyDays = Array(firstDayOfWeek).fill(null)

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  // Filtrar citas del día seleccionado
  const dayAppointments = appointments
    .filter(apt => {
      if (apt.appointment_date !== selectedDate.toISOString().split('T')[0]) return false
      if (filterService !== 'all' && apt.service_id !== filterService) return false
      if (filterEmployee !== 'all' && apt.employee_id !== filterEmployee) return false
      if (filterStatus !== 'all' && apt.status !== filterStatus) return false
      return true
    })
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))

  // Timeline de 09:00 a 18:00
  const timeSlots = Array.from({ length: 19 }, (_, i) => {
    const hour = i + 9
    return `${hour.toString().padStart(2, '0')}:00`
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 p-8">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Citas</h1>
          <p className="text-gray-600 mt-1">Gestiona todas las citas de tu estética</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" strokeWidth={2.5} />
          Nueva Cita
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar - Calendario y Filtros */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Mini Calendario */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-600" strokeWidth={2} />
              </button>
              <h3 className="font-bold text-gray-900">
                {format(currentMonth, 'MMMM yyyy', { locale: es })}
              </h3>
              <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5 text-gray-600" strokeWidth={2} />
              </button>
            </div>

            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => (
                <div key={i} className="text-center text-xs font-semibold text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Días del mes */}
            <div className="grid grid-cols-7 gap-1">
              {emptyDays.map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square"></div>
              ))}
              {monthDays.map((day) => {
                const hasAppointments = appointments.some(apt => apt.appointment_date === day.toISOString().split('T')[0])
                const isSelected = isSameDay(day, selectedDate)
                const isCurrentDay = isToday(day)
                
                return (
                  <button
                    key={day.toString()}
                    onClick={() => setSelectedDate(day)}
                    className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-all relative ${
                      isSelected 
                        ? 'bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white font-bold shadow-lg'
                        : isCurrentDay
                        ? 'bg-purple-100 text-purple-900 font-semibold'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {format(day, 'd')}
                    {hasAppointments && !isSelected && (
                      <div className="absolute bottom-1 w-1 h-1 bg-purple-600 rounded-full"></div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Filtros</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Servicio</label>
                <select
                  value={filterService}
                  onChange={(e) => setFilterService(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-purple-300 focus:ring-2 focus:ring-purple-100 outline-none text-sm"
                >
                  <option value="all">Todos los servicios</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Empleado</label>
                <select
                  value={filterEmployee}
                  onChange={(e) => setFilterEmployee(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-purple-300 focus:ring-2 focus:ring-purple-100 outline-none text-sm"
                >
                  <option value="all">Todos los empleados</option>
                  {stylists.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Estado</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-purple-300 focus:ring-2 focus:ring-purple-100 outline-none text-sm"
                >
                  <option value="all">Todos</option>
                  <option value="pending">Pendiente</option>
                  <option value="confirmed">Confirmada</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Main - Timeline de Citas */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            
            {/* Header del día */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-fuchsia-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {dayAppointments.length} {dayAppointments.length === 1 ? 'cita' : 'citas'}
                  </p>
                </div>
                
                {/* Toggle de vista */}
                <div className="flex gap-2 bg-white rounded-lg p-1 border border-gray-200">
                  <button
                    onClick={() => setViewMode('day')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      viewMode === 'day'
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Día
                  </button>
                  <button
                    onClick={() => setViewMode('week')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      viewMode === 'week'
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Semana
                  </button>
                  <button
                    onClick={() => setViewMode('month')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      viewMode === 'month'
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Mes
                  </button>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="p-6">
              {dayAppointments.length === 0 ? (
                <div className="text-center py-16">
                  <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" strokeWidth={1.5} />
                  <p className="text-gray-500 font-medium">No hay citas para este día</p>
                  <p className="text-gray-400 text-sm mt-1">Selecciona otra fecha o crea una nueva cita</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {timeSlots.map(timeSlot => {
                    const appointmentsAtTime = dayAppointments.filter(apt => 
                      apt.appointment_time.startsWith(timeSlot.slice(0, 2))
                    )

                    return (
                      <div key={timeSlot} className="flex gap-4">
                        {/* Time label */}
                        <div className="w-16 text-sm font-semibold text-gray-500 pt-2">
                          {timeSlot}
                        </div>

                        {/* Appointments */}
                        <div className="flex-1 space-y-2">
                          {appointmentsAtTime.length > 0 ? (
                            appointmentsAtTime.map(apt => (
                              <div
                                key={apt.id}
                                className={`rounded-xl p-4 border-2 ${getStatusColor(apt.status)} hover:shadow-md transition-all cursor-pointer`}
                              >
                                <div className="flex items-start gap-3">
                                  {/* Avatar */}
                                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-lg flex items-center justify-center shadow-md shrink-0">
                                    <span className="text-white font-bold text-sm">
                                      {apt.clients.full_name.charAt(0)}
                                    </span>
                                  </div>

                                  {/* Info */}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-900">{apt.clients.full_name}</p>
                                    <p className="text-sm text-gray-600">{apt.services.name}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {apt.appointment_time} - {
                                          (() => {
                                            const [h, m] = apt.appointment_time.split(':').map(Number)
                                            const totalMinutes = h * 60 + m + apt.services.duration_minutes
                                            const endHour = Math.floor(totalMinutes / 60)
                                            const endMin = totalMinutes % 60
                                            return `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
                                          })()
                                        }
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {apt.profiles.full_name}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Status badge */}
                                  <span className="px-3 py-1 text-xs font-semibold rounded-lg shrink-0">
                                    {getStatusLabel(apt.status)}
                                  </span>
                                </div>

                                {/* Actions (solo si está pendiente o confirmada) */}
                                {(apt.status === 'pending' || apt.status === 'confirmed') && (
                                  <div className="flex gap-2 mt-3 pt-3 border-t border-current/10">
                                    {apt.status === 'pending' && (
                                      <button
                                        onClick={() => handleStatusChange(apt.id, 'confirmed')}
                                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-lg transition-colors"
                                      >
                                        Confirmar
                                      </button>
                                    )}
                                    {apt.status === 'confirmed' && (
                                      <button
                                        onClick={() => handleStatusChange(apt.id, 'completed')}
                                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors"
                                      >
                                        Completar
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleStatusChange(apt.id, 'cancelled')}
                                      className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded-lg transition-colors"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="h-2"></div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Nueva Cita */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-5 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-2xl font-bold text-white">Nueva Cita</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" strokeWidth={2.5} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cliente *</label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                  >
                    <option value="">Seleccionar cliente...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Servicio *</label>
                  <select
                    value={formData.serviceId}
                    onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                  >
                    <option value="">Seleccionar servicio...</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.duration_minutes} min - ${s.price})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha *</label>
                  <input
                    type="date"
                    value={formData.appointmentDate}
                    onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Hora *</label>
                  <select
                    value={formData.appointmentTime}
                    onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                  >
                    <option value="">Seleccionar hora...</option>
                    {Array.from({ length: 19 }, (_, i) => {
                      const hour = i + 9
                      return [`${hour.toString().padStart(2, '0')}:00`, `${hour.toString().padStart(2, '0')}:30`]
                    }).flat().map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>

                {userRole !== 'estilista' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Estilista *</label>
                    <select
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                    >
                      <option value="">Seleccionar estilista...</option>
                      {stylists.map(s => (
                        <option key={s.id} value={s.id}>{s.full_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notas</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notas adicionales..."
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 flex gap-3 sticky bottom-0">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAppointment}
                disabled={!formData.clientId || !formData.serviceId || !formData.appointmentTime || (userRole !== 'estilista' && !formData.employeeId)}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Crear Cita
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}