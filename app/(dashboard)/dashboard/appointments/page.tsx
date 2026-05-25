'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Select } from '@/app/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Plus, Calendar as CalendarIcon, Clock, User, List, Grid } from 'lucide-react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = { es }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

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

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: Appointment
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
  
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  
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
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('No hay usuario autenticado')
        alert('Debes iniciar sesión primero')
        window.location.href = '/login'
        return
      }

      setUserId(user.id)

      // Obtener rol del usuario
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
    } catch (error) {
      console.error('Error al inicializar:', error)
    }
  }

  const loadAppointments = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No hay usuario autenticado')
      return
    }

    // Obtener rol del usuario
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

    // Si es estilista, solo ver SUS citas
    if (profile?.role === 'estilista') {
      query = query.eq('employee_id', user.id)
    }

    // Admin y cajero ven todas las citas
    const { data, error } = await query
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })

    if (error) {
      console.error('Error cargando citas:', error)
      return
    }

    if (data) setAppointments(data as any)
  } catch (error) {
    console.error('Error inesperado:', error)
  }
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
    try {
      // Verificar autenticación
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('Debes iniciar sesión primero')
        window.location.href = '/login'
        return
      }

      // Validar campos
      if (!formData.clientId || !formData.serviceId || !formData.appointmentTime) {
        alert('Por favor completa todos los campos obligatorios')
        return
      }

      // Determinar employee_id
      let employeeId = formData.employeeId
      if (userRole === 'estilista') {
        employeeId = userId!
      }

      if (!employeeId) {
        alert('Debes seleccionar una estilista')
        return
      }

      console.log('Creando cita con datos:', {
        client_id: formData.clientId,
        service_id: formData.serviceId,
        employee_id: employeeId,
        appointment_date: formData.appointmentDate,
        appointment_time: formData.appointmentTime,
        notes: formData.notes,
        status: 'pending',
        assigned_by: userId,
      })

      const { data, error } = await supabase
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
        .select()

      if (error) {
        console.error('Error al crear cita:', error)
        alert(`Error al crear la cita: ${error.message}`)
        return
      }

      console.log('Cita creada exitosamente:', data)

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
      alert('¡Cita creada exitosamente!')

    } catch (error) {
      console.error('Error inesperado:', error)
      alert('Error inesperado al crear la cita')
    }
  }

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId)

    if (error) {
      console.error('Error al actualizar estado:', error)
      alert('Error al actualizar el estado')
      return
    }

    loadAppointments()
  }

  const handleNoShow = async (appointmentId: string) => {
    if (confirm('¿Marcar como "No llegó"?')) {
      await handleStatusChange(appointmentId, 'no_show')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, any> = {
      pending: 'warning',
      confirmed: 'default',
      completed: 'success',
      cancelled: 'danger',
      no_show: 'destructive',
      rescheduled: 'default',
    }
    return colors[status] || 'default'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      completed: 'Completada',
      cancelled: 'Cancelada',
      no_show: 'No llegó',
      rescheduled: 'Reagendada',
    }
    return labels[status] || status
  }

  // Convertir citas a eventos del calendario
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return appointments.map(apt => {
      const [hours, minutes] = apt.appointment_time.split(':')
      const start = new Date(apt.appointment_date)
      start.setHours(parseInt(hours), parseInt(minutes), 0)
      
      const end = new Date(start)
      end.setMinutes(end.getMinutes() + apt.services.duration_minutes)

      return {
        id: apt.id,
        title: `${apt.clients.full_name} - ${apt.services.name}`,
        start,
        end,
        resource: apt,
      }
    })
  }, [appointments])

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const status = event.resource.status
    const colors: Record<string, { backgroundColor: string; color: string }> = {
      pending: { backgroundColor: '#FEF3C7', color: '#92400E' },
      confirmed: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
      completed: { backgroundColor: '#D1FAE5', color: '#065F46' },
      cancelled: { backgroundColor: '#FEE2E2', color: '#991B1B' },
      no_show: { backgroundColor: '#FEE2E2', color: '#991B1B' },
    }

    return {
      style: colors[status] || { backgroundColor: '#E5E7EB', color: '#374151' }
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
  <h1 className="text-4xl font-bold text-gray-900 mb-2">
    {userRole === 'estilista' ? 'Mis Citas' : 'Agenda'}
  </h1>
  <p className="text-gray-600">
    {userRole === 'estilista' 
      ? 'Gestiona tus citas asignadas' 
      : 'Gestiona las citas de tu centro de estética'}
  </p>
</div>
        <div className="flex gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'calendar' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <Grid className="w-4 h-4 mr-2" />
              Calendario
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4 mr-2" />
              Lista
            </Button>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Cita
          </Button>
        </div>
      </div>

      {/* Vista Calendario */}
      {viewMode === 'calendar' && (
        <Card className="p-6">
          <div style={{ height: '700px' }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              eventPropGetter={eventStyleGetter}
              messages={{
                next: 'Siguiente',
                previous: 'Anterior',
                today: 'Hoy',
                month: 'Mes',
                week: 'Semana',
                day: 'Día',
                agenda: 'Agenda',
                date: 'Fecha',
                time: 'Hora',
                event: 'Cita',
                noEventsInRange: 'No hay citas en este rango',
                showMore: (total) => `+ Ver más (${total})`,
              }}
              onSelectEvent={(event) => {
                alert(`Cita: ${event.title}\nCliente: ${event.resource.clients.full_name}\nEstado: ${getStatusLabel(event.resource.status)}`)
              }}
            />
          </div>
        </Card>
      )}

      {/* Vista Lista */}
      {viewMode === 'list' && (
        <>
          {/* Filtro de fecha */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <CalendarIcon className="w-5 h-5 text-gray-400" />
                <Input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                />
                <Button
                  variant="outline"
                  onClick={() => setSelectedDate(new Date())}
                >
                  Hoy
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de citas */}
          <Card>
            <CardHeader className="border-b border-gray-100">
              <CardTitle>
                Citas del {selectedDate.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {appointments
                .filter(apt => apt.appointment_date === selectedDate.toISOString().split('T')[0])
                .length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No hay citas para esta fecha
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments
                    .filter(apt => apt.appointment_date === selectedDate.toISOString().split('T')[0])
                    .map((appointment) => (
                      <div
                        key={appointment.id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Clock className="w-4 h-4 text-primary" />
                              <span className="font-bold text-lg text-primary">
                                {appointment.appointment_time}
                              </span>
                              <Badge variant={getStatusColor(appointment.status)}>
                                {getStatusLabel(appointment.status)}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">Cliente</p>
                                <p className="font-medium text-gray-900">
                                  {appointment.clients.full_name}
                                </p>
                                <p className="text-gray-500">{appointment.clients.phone}</p>
                              </div>

                              <div>
                                <p className="text-gray-600">Servicio</p>
                                <p className="font-medium text-gray-900">
                                  {appointment.services.name}
                                </p>
                                <p className="text-gray-500">
                                  {appointment.services.duration_minutes} min · ${appointment.services.price}
                                </p>
                              </div>

                              <div>
                                <p className="text-gray-600">Estilista</p>
                                <p className="font-medium text-gray-900">
                                  <User className="w-4 h-4 inline mr-1" />
                                  {appointment.profiles.full_name}
                                </p>
                              </div>

                              {appointment.notes && (
                                <div>
                                  <p className="text-gray-600">Notas</p>
                                  <p className="text-gray-900">{appointment.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Acciones */}
                          {appointment.status === 'pending' && (
                            <div className="flex flex-col gap-2 ml-4">
                              <Button
                                size="sm"
                                onClick={() => handleStatusChange(appointment.id, 'confirmed')}
                              >
                                Confirmar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleNoShow(appointment.id)}
                              >
                                No llegó
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(appointment.id, 'cancelled')}
                              >
                                Cancelar
                              </Button>
                            </div>
                          )}

                          {appointment.status === 'confirmed' && (
                            <div className="flex flex-col gap-2 ml-4">
                              <Button
                                size="sm"
                                onClick={() => handleStatusChange(appointment.id, 'completed')}
                              >
                                Completar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleNoShow(appointment.id)}
                              >
                                No llegó
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal Nueva Cita */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Nueva Cita</h2>

            <div className="space-y-5">
              {/* Cliente */}
              <Select
                label="Cliente *"
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                options={[
                  { value: '', label: 'Seleccionar cliente...' },
                  ...clients.map(c => ({ value: c.id, label: c.full_name }))
                ]}
              />

              {/* Servicio */}
              <Select
                label="Servicio *"
                value={formData.serviceId}
                onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                options={[
                  { value: '', label: 'Seleccionar servicio...' },
                  ...services.map(s => ({ 
                    value: s.id, 
                    label: `${s.name} (${s.duration_minutes} min - $${s.price})` 
                  }))
                ]}
              />

              {/* Fecha */}
              <Input
                label="Fecha *"
                type="date"
                value={formData.appointmentDate}
                onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />

              {/* Estilista (solo para cajeros/admin) */}
              {userRole !== 'estilista' && (
                <Select
                  label="Estilista *"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  options={[
                    { value: '', label: 'Seleccionar estilista...' },
                    ...stylists.map(s => ({ value: s.id, label: s.full_name }))
                  ]}
                />
              )}

              {/* Hora manual */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hora de la cita *
                </label>
                <select
                  value={formData.appointmentTime}
                  onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="">Seleccionar hora...</option>
                  <option value="09:00">09:00</option>
                  <option value="09:30">09:30</option>
                  <option value="10:00">10:00</option>
                  <option value="10:30">10:30</option>
                  <option value="11:00">11:00</option>
                  <option value="11:30">11:30</option>
                  <option value="12:00">12:00</option>
                  <option value="12:30">12:30</option>
                  <option value="13:00">13:00</option>
                  <option value="13:30">13:30</option>
                  <option value="14:00">14:00</option>
                  <option value="14:30">14:30</option>
                  <option value="15:00">15:00</option>
                  <option value="15:30">15:30</option>
                  <option value="16:00">16:00</option>
                  <option value="16:30">16:30</option>
                  <option value="17:00">17:00</option>
                  <option value="17:30">17:30</option>
                  <option value="18:00">18:00</option>
                </select>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Button 
                onClick={handleCreateAppointment} 
                className="flex-1 py-3"
                disabled={!formData.clientId || !formData.serviceId || !formData.appointmentTime || (userRole !== 'estilista' && !formData.employeeId)}
              >
                Crear Cita
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1 py-3"
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