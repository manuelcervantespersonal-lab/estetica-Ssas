'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, CheckCircle2, XCircle,
  AlertCircle, RotateCcw, Clock, User, X
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, addMonths, subMonths, isToday, addDays
} from 'date-fns'
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

export default function AppointmentsCalendarPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [userId, setUserId] = useState('')
  const [userRole, setUserRole] = useState('')
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<Appointment | null>(null)
  const [rescheduleData, setRescheduleData] = useState({ newDate: '', newTime: '' })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => { initialize() }, [])

  const initialize = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    setUserId(user.id)
    setUserRole(profile?.role || '')
    await loadAppointments(user.id, profile?.role || '')
    setLoading(false)
  }

  const loadAppointments = async (uid: string, role: string) => {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        clients(full_name, phone),
        services(name, duration_minutes, price)
      `)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })

    if (role === 'estilista') {
      query = query.eq('employee_id', uid)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error cargando citas:', error)
      return
    }

    if (!data || data.length === 0) {
      setAppointments([])
      return
    }

    // Cargar estilistas por separado
    const employeeIds = [...new Set(data.map((a: any) => a.employee_id).filter(Boolean))]
    let profilesData: any[] = []
    if (employeeIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', employeeIds)
      profilesData = profiles || []
    }

    const enriched = data.map((apt: any) => ({
      ...apt,
      profiles: profilesData.find(p => p.id === apt.employee_id) || { full_name: 'Sin asignar' }
    }))

    setAppointments(enriched as any)
  }

  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
    if (error) { alert('Error: ' + error.message); return }
    await loadAppointments(userId, userRole)
  }

  const handleReschedule = async () => {
    if (!appointmentToReschedule || !rescheduleData.newDate || !rescheduleData.newTime) {
      alert('Completa la nueva fecha y hora')
      return
    }
    setSaving(true)

    await supabase.from('appointments').update({
      status: 'cancelled',
      notes: (appointmentToReschedule.notes || '') + `\nReagendada para ${rescheduleData.newDate} ${rescheduleData.newTime}`
    }).eq('id', appointmentToReschedule.id)

    const { error } = await supabase.from('appointments').insert({
      client_id: appointmentToReschedule.client_id,
      service_id: appointmentToReschedule.service_id,
      employee_id: appointmentToReschedule.employee_id,
      appointment_date: rescheduleData.newDate,
      appointment_time: rescheduleData.newTime,
      status: 'pending',
      notes: `Reagendada desde ${appointmentToReschedule.appointment_date} ${appointmentToReschedule.appointment_time}`,
      assigned_by: userId
    })

    if (error) { alert('Error: ' + error.message) }
    else {
      alert('✅ Cita reagendada exitosamente')
      setShowRescheduleModal(false)
      await loadAppointments(userId, userRole)
    }
    setSaving(false)
  }

  const getStatusColor = (status: string) => ({
    pending: 'bg-amber-50 border-amber-300 text-amber-800',
    confirmed: 'bg-cyan-50 border-cyan-300 text-cyan-800',
    completed: 'bg-green-50 border-green-300 text-green-800',
    cancelled: 'bg-red-50 border-red-300 text-red-800',
    no_show: 'bg-gray-50 border-gray-300 text-gray-700',
  }[status] || 'bg-gray-50 border-gray-200 text-gray-700')

  const getStatusBadgeColor = (status: string) => ({
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    confirmed: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
    no_show: 'bg-gray-100 text-gray-600 border-gray-200',
  }[status] || 'bg-gray-100 text-gray-600')

  const getStatusLabel = (status: string) => ({
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    completed: 'Completada',
    cancelled: 'Cancelada',
    no_show: 'No llegó',
  }[status] || status)

  const getDotColor = (status: string) => ({
    pending: 'bg-amber-400',
    confirmed: 'bg-cyan-400',
    completed: 'bg-green-400',
    cancelled: 'bg-red-400',
    no_show: 'bg-gray-400',
  }[status] || 'bg-gray-400')

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const firstDayOfWeek = monthStart.getDay()

  const dayAppointments = appointments
    .filter(apt => apt.appointment_date === format(selectedDate, 'yyyy-MM-dd'))
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))

  const getAppointmentsForDay = (day: Date) =>
    appointments.filter(apt => apt.appointment_date === format(day, 'yyyy-MM-dd'))

  const timeSlots = Array.from({ length: 23 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8
    const min = i % 2 === 0 ? '00' : '30'
    return `${hour.toString().padStart(2, '0')}:${min}`
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
          <h1 className="text-3xl font-bold text-gray-900">Ver Citas</h1>
          <p className="text-gray-600 mt-1">{appointments.length} citas en total</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/appointments/new')}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all">
          + Agendar Cita
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Sidebar: Calendario */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">

            {/* Navegación mes */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <h3 className="font-bold text-gray-900 capitalize text-sm">
                {format(currentMonth, 'MMMM yyyy', { locale: es })}
              </h3>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                <div key={i} className="text-center text-xs font-bold text-gray-400 py-1">{d}</div>
              ))}
            </div>

            {/* Días del mes */}
            <div className="grid grid-cols-7 gap-0.5">
              {Array(firstDayOfWeek).fill(null).map((_, i) => <div key={`e-${i}`}></div>)}
              {monthDays.map(day => {
                const dayApts = getAppointmentsForDay(day)
                const isSelected = isSameDay(day, selectedDate)
                const isCurrent = isToday(day)
                const statuses = [...new Set(dayApts.map(a => a.status))]

                return (
                  <button key={day.toString()}
                    onClick={() => setSelectedDate(day)}
                    className={`relative aspect-square flex flex-col items-center justify-center text-xs rounded-lg transition-all ${
                      isSelected
                        ? 'bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white shadow-md'
                        : isCurrent
                        ? 'bg-purple-100 text-purple-700 font-bold'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}>
                    <span className="font-semibold">{format(day, 'd')}</span>
                    {dayApts.length > 0 && !isSelected && (
                      <div className="flex gap-0.5 mt-0.5">
                        {statuses.slice(0, 3).map((s, i) => (
                          <div key={i} className={`w-1 h-1 rounded-full ${getDotColor(s)}`}></div>
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Leyenda */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Estados</p>
            {[
              { status: 'pending', label: 'Pendiente' },
              { status: 'confirmed', label: 'Confirmada' },
              { status: 'completed', label: 'Completada' },
              { status: 'no_show', label: 'No llegó' },
              { status: 'cancelled', label: 'Cancelada' },
            ].map(s => (
              <div key={s.status} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${getDotColor(s.status)}`}></div>
                <span className="text-xs text-gray-600">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel derecho: Citas del día */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            {/* Header del día */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-fuchsia-50">
              <h2 className="text-xl font-bold text-gray-900 capitalize">
                {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                {dayAppointments.length} {dayAppointments.length === 1 ? 'cita' : 'citas'}
              </p>
            </div>

            {/* Lista de citas */}
            <div className="p-6 max-h-[600px] overflow-y-auto">
              {dayAppointments.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-10 h-10 text-gray-300" strokeWidth={1.5} />
                  </div>
                  <p className="text-gray-500 font-medium text-lg">No hay citas para este día</p>
                  <p className="text-gray-400 text-sm mt-1">Selecciona otro día o agenda una nueva cita</p>
                  <button onClick={() => router.push('/dashboard/appointments/new')}
                    className="mt-4 px-6 py-2.5 bg-purple-100 text-purple-700 font-semibold rounded-xl hover:bg-purple-200 transition-colors text-sm">
                    + Agendar una cita
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {dayAppointments.map(apt => (
                    <div key={apt.id}
                      className={`rounded-2xl border-2 p-5 transition-all hover:shadow-md ${getStatusColor(apt.status)}`}>
                      <div className="flex items-start gap-4">

                        {/* Hora */}
                        <div className="text-center shrink-0 min-w-[60px]">
                          <p className="text-xl font-bold">{apt.appointment_time?.substring(0, 5)}</p>
                          <p className="text-xs opacity-70 mt-0.5">{apt.services?.duration_minutes} min</p>
                        </div>

                        {/* Línea separadora */}
                        <div className="w-px bg-current opacity-20 self-stretch shrink-0"></div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-bold text-gray-900 text-lg">{apt.clients?.full_name}</p>
                            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${getStatusBadgeColor(apt.status)}`}>
                              {getStatusLabel(apt.status)}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-gray-700 mb-1">{apt.services?.name}</p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {apt.profiles?.full_name}
                            </span>
                            {apt.clients?.phone && (
                              <span>📞 {apt.clients.phone}</span>
                            )}
                            {apt.services?.price && (
                              <span className="font-semibold text-purple-600">
                                ${apt.services.price.toLocaleString()}
                              </span>
                            )}
                          </div>
                          {apt.notes && (
                            <p className="text-xs text-gray-500 italic mt-2 bg-white/60 rounded-lg px-3 py-1.5">
                              {apt.notes}
                            </p>
                          )}
                        </div>

                        {/* Acciones */}
                        <div className="flex flex-col gap-2 shrink-0">
                          {apt.status === 'pending' && (
                            <>
                              <button onClick={() => handleStatusChange(apt.id, 'confirmed')}
                                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap">
                                <CheckCircle2 className="w-3 h-3" /> Confirmar
                              </button>
                              <button onClick={() => handleStatusChange(apt.id, 'no_show')}
                                className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap">
                                <AlertCircle className="w-3 h-3" /> No llegó
                              </button>
                              <button onClick={() => handleStatusChange(apt.id, 'cancelled')}
                                className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap">
                                <XCircle className="w-3 h-3" /> Cancelar
                              </button>
                            </>
                          )}
                          {apt.status === 'confirmed' && (
                            <>
                              <button onClick={() => handleStatusChange(apt.id, 'completed')}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap">
                                <CheckCircle2 className="w-3 h-3" /> Completar
                              </button>
                              <button onClick={() => handleStatusChange(apt.id, 'no_show')}
                                className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap">
                                <AlertCircle className="w-3 h-3" /> No llegó
                              </button>
                              <button onClick={() => handleStatusChange(apt.id, 'cancelled')}
                                className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap">
                                <XCircle className="w-3 h-3" /> Cancelar
                              </button>
                            </>
                          )}
                          {apt.status === 'no_show' && (
                            <button onClick={() => {
                              setAppointmentToReschedule(apt)
                              setRescheduleData({
                                newDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
                                newTime: apt.appointment_time?.substring(0, 5) || '09:00'
                              })
                              setShowRescheduleModal(true)
                            }}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap">
                              <RotateCcw className="w-3 h-3" /> Reagendar
                            </button>
                          )}
                          {(apt.status === 'completed' || apt.status === 'cancelled') && (
                            <span className="text-xs text-gray-400 italic text-center">Sin acciones</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Reagendar */}
      {showRescheduleModal && appointmentToReschedule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-5 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-white">Reagendar Cita</h2>
                <p className="text-purple-100 text-sm mt-0.5">{appointmentToReschedule.clients?.full_name}</p>
              </div>
              <button onClick={() => setShowRescheduleModal(false)}
                className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors">
                <X className="w-5 h-5 text-white" strokeWidth={2} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Cita original */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-700 uppercase mb-2">Cita Original</p>
                <p className="text-sm text-amber-800">
                  📅 {format(new Date(appointmentToReschedule.appointment_date + 'T12:00:00'), "d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
                <p className="text-sm text-amber-800">🕐 {appointmentToReschedule.appointment_time?.substring(0, 5)}</p>
                <p className="text-sm text-amber-800">💅 {appointmentToReschedule.services?.name}</p>
              </div>

              {/* Nueva fecha y hora */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nueva Fecha *</label>
                  <input type="date"
                    value={rescheduleData.newDate}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, newDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-300 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nueva Hora *</label>
                  <select value={rescheduleData.newTime}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, newTime: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-300 outline-none text-sm">
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex gap-3">
              <button onClick={() => setShowRescheduleModal(false)}
                className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleReschedule} disabled={saving}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" />
                {saving ? 'Reagendando...' : 'Confirmar Reagendamiento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}