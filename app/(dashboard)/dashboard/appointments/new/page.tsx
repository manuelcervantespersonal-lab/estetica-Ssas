'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  Calendar, Clock, User, Scissors, ChevronLeft, ChevronRight,
  CheckCircle2, AlertCircle, Search, Loader2
} from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isToday, isBefore, startOfDay, addMinutes } from 'date-fns'
import { es } from 'date-fns/locale'

interface Client { id: string; full_name: string; phone: string }
interface Service { id: string; name: string; duration_minutes: number; price: number; category: string }
interface Stylist { id: string; full_name: string }
interface TimeSlot { time: string; available: boolean; stylistsAvailable: Stylist[]; stylistsBooked: number }

export default function NewAppointmentPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: cliente+servicio, 2: fecha, 3: hora+estilista, 4: confirmar
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Datos
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [stylists, setStylists] = useState<Stylist[]>([])

  // Selecciones
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [selectedStylist, setSelectedStylist] = useState<Stylist | null>(null)
  const [notes, setNotes] = useState('')

  // Búsqueda
  const [clientSearch, setClientSearch] = useState('')
  const [serviceSearch, setServiceSearch] = useState('')

  // Calendario
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [userId, setUserId] = useState('')
  const [userRole, setUserRole] = useState('')

  const supabase = createClient()

  useEffect(() => { initialize() }, [])

  useEffect(() => {
    if (selectedDate && selectedService) {
      loadTimeSlots()
    }
  }, [selectedDate, selectedService])

  const initialize = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    setUserId(user.id)
    setUserRole(profile?.role || '')

    await Promise.all([loadClients(), loadServices(), loadStylists()])
  }

  const loadClients = async () => {
    const { data } = await supabase.from('clients').select('id, full_name, phone').order('full_name')
    if (data) setClients(data)
  }

  const loadServices = async () => {
    const { data } = await supabase
      .from('services').select('id, name, duration_minutes, price, category')
      .eq('is_active', true).order('name')
    if (data) setServices(data)
  }

  const loadStylists = async () => {
    const { data } = await supabase
      .from('profiles').select('id, full_name')
      .eq('role', 'estilista').eq('is_active', true).order('full_name')
    if (data) setStylists(data)
  }

  const loadTimeSlots = async () => {
    if (!selectedDate || !selectedService) return
    setLoadingSlots(true)

    const dateStr = format(selectedDate, 'yyyy-MM-dd')

    // Cargar citas existentes para ese día
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('appointment_time, employee_id, services(duration_minutes)')
      .eq('appointment_date', dateStr)
      .in('status', ['pending', 'confirmed'])

    const slots: TimeSlot[] = []
    const startHour = 8
    const endHour = 19
    const intervalMinutes = 30

    let time = new Date(selectedDate)
    time.setHours(startHour, 0, 0, 0)
    const endTime = new Date(selectedDate)
    endTime.setHours(endHour, 0, 0, 0)

    while (time < endTime) {
      const timeStr = format(time, 'HH:mm')
      const slotEnd = addMinutes(time, selectedService.duration_minutes)

      // Verificar cuántas estilistas están ocupadas en este slot
      const bookedStylists = new Set<string>()

      existingAppointments?.forEach(apt => {
        const aptStart = new Date(selectedDate)
        const [h, m] = apt.appointment_time.split(':').map(Number)
        aptStart.setHours(h, m, 0, 0)
        const aptDuration = (apt.services as any)?.duration_minutes || 60
        const aptEnd = addMinutes(aptStart, aptDuration)

        // Verificar si hay solapamiento
        if (aptStart < slotEnd && aptEnd > time) {
          bookedStylists.add(apt.employee_id)
        }
      })

      const stylistsAvailable = stylists.filter(s => !bookedStylists.has(s.id))
      const available = stylistsAvailable.length > 0

      slots.push({
        time: timeStr,
        available,
        stylistsAvailable,
        stylistsBooked: bookedStylists.size
      })

      time = addMinutes(time, intervalMinutes)
    }

    setTimeSlots(slots)
    setLoadingSlots(false)
  }

  const handleSave = async () => {
    if (!selectedClient || !selectedService || !selectedDate || !selectedSlot || !selectedStylist) return
    setSaving(true)

    const { error } = await supabase.from('appointments').insert({
      client_id: selectedClient.id,
      service_id: selectedService.id,
      employee_id: selectedStylist.id,
      appointment_date: format(selectedDate, 'yyyy-MM-dd'),
      appointment_time: selectedSlot.time,
      status: 'pending',
      notes,
      assigned_by: userId
    })

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert(`✅ Cita agendada para ${selectedClient.full_name} el ${format(selectedDate, "d 'de' MMMM", { locale: es })} a las ${selectedSlot.time}`)
      router.push('/dashboard/appointments/calendar')
    }
    setSaving(false)
  }

  // Calendario
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const firstDayOfWeek = monthStart.getDay()

  const filteredClients = clients.filter(c =>
    c.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone?.includes(clientSearch)
  )

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase())
  )

  const canProceedStep1 = selectedClient && selectedService
  const canProceedStep2 = selectedDate !== null
  const canProceedStep3 = selectedSlot && selectedStylist

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 p-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Agendar Cita</h1>
        <p className="text-gray-600 mt-1">Completa los pasos para agendar una nueva cita</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { n: 1, label: 'Cliente y Servicio' },
          { n: 2, label: 'Fecha' },
          { n: 3, label: 'Hora y Estilista' },
          { n: 4, label: 'Confirmar' },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
              step === s.n
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg'
                : step > s.n
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {step > s.n
                ? <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                : <span className="w-4 h-4 flex items-center justify-center text-xs font-bold">{s.n}</span>
              }
              {s.label}
            </div>
            {i < 3 && <div className={`w-8 h-0.5 ${step > s.n ? 'bg-green-400' : 'bg-gray-200'}`}></div>}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* STEP 1: Cliente y Servicio */}
        {step === 1 && (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-8">
              {/* Cliente */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" /> Cliente
                </h2>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Buscar cliente..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 outline-none text-sm" />
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {filteredClients.map(client => (
                    <button key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                        selectedClient?.id === client.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                      }`}>
                      <p className="font-semibold text-gray-900 text-sm">{client.full_name}</p>
                      <p className="text-xs text-gray-500">{client.phone}</p>
                    </button>
                  ))}
                  {filteredClients.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-8">No se encontraron clientes</p>
                  )}
                </div>
              </div>

              {/* Servicio */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-fuchsia-600" /> Servicio
                </h2>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Buscar servicio..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 outline-none text-sm" />
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {filteredServices.map(service => (
                    <button key={service.id}
                      onClick={() => setSelectedService(service)}
                      className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                        selectedService?.id === service.id
                          ? 'border-fuchsia-500 bg-fuchsia-50'
                          : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                      }`}>
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-gray-900 text-sm">{service.name}</p>
                        <span className="text-xs font-bold text-purple-600">${service.price.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">{service.category}</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {service.duration_minutes} min
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Resumen selección */}
            {(selectedClient || selectedService) && (
              <div className="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-100 flex items-center gap-6">
                {selectedClient && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-gray-700">{selectedClient.full_name}</span>
                  </div>
                )}
                {selectedService && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-gray-700">{selectedService.name} ({selectedService.duration_minutes} min)</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button onClick={() => setStep(2)} disabled={!canProceedStep1}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50">
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Fecha */}
        {step === 2 && (
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" /> Selecciona la Fecha
            </h2>

            <div className="max-w-md mx-auto">
              {/* Header mes */}
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h3 className="text-xl font-bold text-gray-900 capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </h3>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Días semana */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                  <div key={d} className="text-center text-xs font-bold text-gray-500 py-2">{d}</div>
                ))}
              </div>

              {/* Días */}
              <div className="grid grid-cols-7 gap-1">
                {Array(firstDayOfWeek).fill(null).map((_, i) => <div key={`empty-${i}`}></div>)}
                {monthDays.map(day => {
                  const isPast = isBefore(day, startOfDay(new Date()))
                  const isSelected = selectedDate && isSameDay(day, selectedDate)
                  const isCurrent = isToday(day)
                  return (
                    <button key={day.toString()}
                      onClick={() => !isPast && setSelectedDate(day)}
                      disabled={isPast}
                      className={`aspect-square flex items-center justify-center text-sm rounded-xl transition-all font-medium ${
                        isPast ? 'text-gray-300 cursor-not-allowed' :
                        isSelected ? 'bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white shadow-lg scale-110' :
                        isCurrent ? 'bg-purple-100 text-purple-700 font-bold' :
                        'hover:bg-purple-50 text-gray-700'
                      }`}>
                      {format(day, 'd')}
                    </button>
                  )
                })}
              </div>

              {selectedDate && (
                <div className="mt-6 p-4 bg-purple-50 rounded-xl text-center border border-purple-100">
                  <p className="font-bold text-purple-700">
                    {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(1)}
                className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all">
                ← Anterior
              </button>
              <button onClick={() => setStep(3)} disabled={!canProceedStep2}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50">
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Hora y Estilista */}
        {step === 3 && (
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" /> Hora Disponible — {selectedDate && format(selectedDate, "d 'de' MMMM", { locale: es })}
            </h2>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                <p className="ml-3 text-gray-600 font-medium">Cargando disponibilidad...</p>
              </div>
            ) : (
              <div>
                {/* Leyenda */}
                <div className="flex items-center gap-6 mb-4 text-xs font-semibold">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div> Disponible</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></div> Parcialmente ocupado</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div> Sin disponibilidad</div>
                </div>

                {/* Grid de horas */}
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mb-6">
                  {timeSlots.map(slot => {
                    const isSelected = selectedSlot?.time === slot.time
                    const totalStylists = stylists.length
                    const occupancyRate = totalStylists > 0 ? slot.stylistsBooked / totalStylists : 0

                    return (
                      <button key={slot.time}
                        onClick={() => {
                          if (slot.available) {
                            setSelectedSlot(slot)
                            setSelectedStylist(null) // Reset estilista al cambiar hora
                          }
                        }}
                        disabled={!slot.available}
                        title={!slot.available ? 'Sin estilistas disponibles' : `${slot.stylistsAvailable.length} estilista(s) disponible(s)`}
                        className={`p-3 rounded-xl border-2 text-center transition-all text-sm font-semibold ${
                          !slot.available
                            ? 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed'
                            : isSelected
                            ? 'border-purple-500 bg-purple-600 text-white shadow-lg scale-105'
                            : occupancyRate >= 0.5
                            ? 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400'
                            : 'border-green-200 bg-green-50 text-green-700 hover:border-green-400'
                        }`}>
                        {slot.time}
                        {!slot.available && <div className="text-xs font-normal mt-0.5">Lleno</div>}
                        {slot.available && !isSelected && (
                          <div className="text-xs font-normal mt-0.5 opacity-70">
                            {slot.stylistsAvailable.length}/{totalStylists}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Selección de estilista */}
                {selectedSlot && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3">
                      Estilistas disponibles a las {selectedSlot.time}:
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedSlot.stylistsAvailable.map(stylist => (
                        <button key={stylist.id}
                          onClick={() => setSelectedStylist(stylist)}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            selectedStylist?.id === stylist.id
                              ? 'border-purple-500 bg-purple-50 shadow-md'
                              : 'border-gray-200 hover:border-purple-300 bg-white'
                          }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                              selectedStylist?.id === stylist.id
                                ? 'bg-purple-600 text-white'
                                : 'bg-gradient-to-br from-purple-400 to-fuchsia-400 text-white'
                            }`}>
                              {stylist.full_name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{stylist.full_name}</p>
                              <p className="text-xs text-green-600 font-medium">Disponible</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Notas opcionales */}
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Notas (opcional)</label>
                      <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                        rows={2} placeholder="Preferencias, observaciones del cliente..."
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-300 outline-none text-sm resize-none" />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(2)}
                className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all">
                ← Anterior
              </button>
              <button onClick={() => setStep(4)} disabled={!canProceedStep3}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50">
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Confirmar */}
        {step === 4 && selectedClient && selectedService && selectedDate && selectedSlot && selectedStylist && (
          <div className="p-6 max-w-xl mx-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-6 text-center">Confirmar Cita</h2>

            <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-2xl p-6 border-2 border-purple-200 space-y-4 mb-6">
              {[
                { label: 'Cliente', value: selectedClient.full_name, icon: <User className="w-4 h-4 text-purple-600" /> },
                { label: 'Servicio', value: `${selectedService.name} (${selectedService.duration_minutes} min)`, icon: <Scissors className="w-4 h-4 text-fuchsia-600" /> },
                { label: 'Fecha', value: format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }), icon: <Calendar className="w-4 h-4 text-blue-600" /> },
                { label: 'Hora', value: selectedSlot.time, icon: <Clock className="w-4 h-4 text-green-600" /> },
                { label: 'Estilista', value: selectedStylist.full_name, icon: <User className="w-4 h-4 text-orange-600" /> },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-4 p-3 bg-white rounded-xl">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{item.label}</p>
                    <p className="font-bold text-gray-900 capitalize">{item.value}</p>
                  </div>
                </div>
              ))}

              {notes && (
                <div className="p-3 bg-white rounded-xl">
                  <p className="text-xs text-gray-500 font-medium">Notas</p>
                  <p className="text-sm text-gray-700 mt-1">{notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                <span className="font-semibold text-gray-700">Precio del servicio</span>
                <span className="text-xl font-bold text-purple-600">${selectedService.price.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(3)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all">
                ← Anterior
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-8 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {saving
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Agendando...</>
                  : <><CheckCircle2 className="w-5 h-5" /> Confirmar Cita</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}