'use server'

import { createClient } from '@/lib/supabase'

export interface TimeSlot {
  time: string // "09:00", "09:30", etc.
  available: boolean
}

export interface StylistAvailability {
  employeeId: string
  employeeName: string
  available: boolean // Si está activa globalmente
  slots: TimeSlot[]
}

/**
 * Obtiene las estilistas disponibles para una fecha y servicio específico
 */
export async function getAvailableStylists(
  date: string, // "2024-05-22"
  serviceId: string
): Promise<StylistAvailability[]> {
  const supabase = createClient()

  // 1. Obtener el servicio para saber la duración
  const { data: service } = await supabase
    .from('services')
    .select('duration')
    .eq('id', serviceId)
    .single()

  if (!service) return []

  const durationMinutes = service.duration

  // 2. Obtener todas las estilistas activas
  const { data: stylists } = await supabase
    .from('profiles')
    .select('id, full_name, available')
    .eq('role', 'estilista')
    .eq('available', true)

  if (!stylists || stylists.length === 0) return []

  // 3. Obtener día de la semana (0 = domingo, 6 = sábado)
  const dayOfWeek = new Date(date).getDay()

  // 4. Para cada estilista, calcular sus slots disponibles
  const availabilityPromises = stylists.map(async (stylist) => {
    // Obtener horario configurado para ese día
    const { data: schedule } = await supabase
      .from('employee_schedules')
      .select('start_time, end_time')
      .eq('employee_id', stylist.id)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .single()

    // Si no tiene horario configurado para ese día, no está disponible
    if (!schedule) {
      return {
        employeeId: stylist.id,
        employeeName: stylist.full_name,
        available: stylist.available,
        slots: [],
      }
    }

    // Obtener citas existentes para esa estilista en esa fecha
    const { data: appointments } = await supabase
      .from('appointments')
      .select('appointment_date, appointment_time, service_id')
      .eq('employee_id', stylist.id)
      .eq('appointment_date', date)
      .in('status', ['pending', 'confirmed'])

    // Obtener duraciones de los servicios de las citas existentes
    const appointmentSlots = await Promise.all(
      (appointments || []).map(async (apt) => {
        const { data: aptService } = await supabase
          .from('services')
          .select('duration')
          .eq('id', apt.service_id)
          .single()

        return {
          time: apt.appointment_time,
          duration: aptService?.duration || 60,
        }
      })
    )

    // Generar slots de 30 minutos entre start_time y end_time
    const slots = generateTimeSlots(
      schedule.start_time,
      schedule.end_time,
      appointmentSlots,
      durationMinutes
    )

    return {
      employeeId: stylist.id,
      employeeName: stylist.full_name,
      available: stylist.available,
      slots,
    }
  })

  return await Promise.all(availabilityPromises)
}

/**
 * Verifica si un slot específico está disponible para una estilista
 */
export async function checkSlotAvailability(
  employeeId: string,
  date: string,
  time: string,
  serviceId: string
): Promise<boolean> {
  const supabase = createClient()

  // Obtener duración del servicio
  const { data: service } = await supabase
    .from('services')
    .select('duration')
    .eq('id', serviceId)
    .single()

  if (!service) return false

  const durationMinutes = service.duration

  // Obtener día de la semana
  const dayOfWeek = new Date(date).getDay()

  // Verificar que la estilista tenga horario ese día
  const { data: schedule } = await supabase
    .from('employee_schedules')
    .select('start_time, end_time')
    .eq('employee_id', employeeId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .single()

  if (!schedule) return false

  // Verificar que el tiempo esté dentro del horario
  if (time < schedule.start_time || time >= schedule.end_time) {
    return false
  }

  // Verificar que no haya solapamiento con citas existentes
  const { data: appointments } = await supabase
    .from('appointments')
    .select('appointment_time, service_id')
    .eq('employee_id', employeeId)
    .eq('appointment_date', date)
    .in('status', ['pending', 'confirmed'])

  if (!appointments) return true

  // Verificar solapamientos
  const requestedStart = timeToMinutes(time)
  const requestedEnd = requestedStart + durationMinutes

  for (const apt of appointments) {
    const { data: aptService } = await supabase
      .from('services')
      .select('duration')
      .eq('id', apt.service_id)
      .single()

    const aptStart = timeToMinutes(apt.appointment_time)
    const aptEnd = aptStart + (aptService?.duration || 60)

    // Hay solapamiento si:
    // - La nueva cita empieza antes de que termine la existente Y
    // - La nueva cita termina después de que empiece la existente
    if (requestedStart < aptEnd && requestedEnd > aptStart) {
      return false
    }
  }

  return true
}

/**
 * Genera slots de 30 minutos entre startTime y endTime
 */
function generateTimeSlots(
  startTime: string,
  endTime: string,
  existingAppointments: { time: string; duration: number }[],
  serviceDuration: number
): TimeSlot[] {
  const slots: TimeSlot[] = []
  let currentMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)

  while (currentMinutes < endMinutes) {
    const timeStr = minutesToTime(currentMinutes)
    const slotEnd = currentMinutes + serviceDuration

    // Verificar si hay conflicto con alguna cita existente
    let hasConflict = false
    for (const apt of existingAppointments) {
      const aptStart = timeToMinutes(apt.time)
      const aptEnd = aptStart + apt.duration

      if (currentMinutes < aptEnd && slotEnd > aptStart) {
        hasConflict = true
        break
      }
    }

    slots.push({
      time: timeStr,
      available: !hasConflict,
    })

    currentMinutes += 30 // Slots de 30 minutos
  }

  return slots
}

/**
 * Convierte "HH:MM" a minutos desde medianoche
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Convierte minutos desde medianoche a "HH:MM"
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}