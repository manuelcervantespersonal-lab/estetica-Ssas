'use server'

import { createClient } from '@/lib/supabase'
import { getUserRole } from '@/app/lib/permissions'
import { checkSlotAvailability } from './availability'
import { revalidatePath } from 'next/cache'

export interface CreateAppointmentInput {
  clientId: string
  serviceId: string
  employeeId?: string // Opcional para estilistas (se auto-asignan)
  appointmentDate: string
  appointmentTime: string
  notes?: string
}

/**
 * Crear una cita con lógica de roles
 */
export async function createAppointmentAction(input: CreateAppointmentInput) {
  const supabase = createClient()
  
  // Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  // Obtener rol del usuario
  const role = await getUserRole()
  if (!role) {
    return { success: false, error: 'Rol no encontrado' }
  }

  let finalEmployeeId = input.employeeId

  // LÓGICA DE ROLES
  if (role === 'estilista') {
    // Las estilistas SOLO pueden agendarse a sí mismas
    finalEmployeeId = user.id
  } else if (role === 'cajero' || role === 'admin') {
    // Cajeros y admins DEBEN seleccionar una estilista
    if (!input.employeeId) {
      return { success: false, error: 'Debe seleccionar una estilista' }
    }
    finalEmployeeId = input.employeeId
  }

  // Verificar disponibilidad del slot
  const isAvailable = await checkSlotAvailability(
    finalEmployeeId!,
    input.appointmentDate,
    input.appointmentTime,
    input.serviceId
  )

  if (!isAvailable) {
    return { 
      success: false, 
      error: 'El horario seleccionado no está disponible' 
    }
  }

  // Crear la cita
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      client_id: input.clientId,
      service_id: input.serviceId,
      employee_id: finalEmployeeId,
      appointment_date: input.appointmentDate,
      appointment_time: input.appointmentTime,
      notes: input.notes,
      status: 'pending',
      assigned_by: user.id, // Quién agendó la cita
      can_reschedule: true,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/appointments')
  return { success: true, data }
}

/**
 * Reagendar una cita (crea nueva cita vinculada)
 */
export async function rescheduleAppointmentAction(
  appointmentId: string,
  newDate: string,
  newTime: string
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  const role = await getUserRole()
  if (!role) {
    return { success: false, error: 'Rol no encontrado' }
  }

  // Obtener la cita original
  const { data: originalAppointment, error: fetchError } = await supabase
    .from('appointments')
    .select('*, services(duration)')
    .eq('id', appointmentId)
    .single()

  if (fetchError || !originalAppointment) {
    return { success: false, error: 'Cita no encontrada' }
  }

  // Verificar que se pueda reagendar
  if (!originalAppointment.can_reschedule) {
    return { success: false, error: 'Esta cita no puede ser reagendada' }
  }

  // Verificar que no esté completada
  if (originalAppointment.status === 'completed') {
    return { success: false, error: 'No se puede reagendar una cita completada' }
  }

  // Verificar permisos
  if (role === 'estilista') {
    // Estilistas solo pueden reagendar sus propias citas
    if (originalAppointment.employee_id !== user.id) {
      return { success: false, error: 'No tienes permiso para reagendar esta cita' }
    }
  }

  // Verificar disponibilidad en el nuevo horario
  const isAvailable = await checkSlotAvailability(
    originalAppointment.employee_id,
    newDate,
    newTime,
    originalAppointment.service_id
  )

  if (!isAvailable) {
    return { 
      success: false, 
      error: 'El nuevo horario no está disponible' 
    }
  }

  // Marcar la cita original como reagendada
  const { error: updateError } = await supabase
    .from('appointments')
    .update({
      status: 'rescheduled',
      can_reschedule: false,
    })
    .eq('id', appointmentId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Crear nueva cita vinculada
  const { data: newAppointment, error: createError } = await supabase
    .from('appointments')
    .insert({
      client_id: originalAppointment.client_id,
      service_id: originalAppointment.service_id,
      employee_id: originalAppointment.employee_id,
      appointment_date: newDate,
      appointment_time: newTime,
      notes: originalAppointment.notes,
      status: 'pending',
      assigned_by: user.id,
      can_reschedule: true,
      previous_appointment_id: appointmentId, // Vínculo con la original
    })
    .select()
    .single()

  if (createError) {
    return { success: false, error: createError.message }
  }

  revalidatePath('/dashboard/appointments')
  return { success: true, data: newAppointment }
}

/**
 * Marcar una cita como "no llegó"
 */
export async function markNoShowAction(appointmentId: string) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'no_show' })
    .eq('id', appointmentId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/appointments')
  return { success: true, data }
}

/**
 * Actualizar estado de una cita
 */
export async function updateAppointmentStatusAction(
  appointmentId: string,
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/appointments')
  return { success: true, data }
}

/**
 * Obtener citas según el rol del usuario
 */
export async function getAppointmentsAction(filters?: {
  date?: string
  employeeId?: string
  status?: string
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado', data: [] }
  }

  const role = await getUserRole()
  if (!role) {
    return { success: false, error: 'Rol no encontrado', data: [] }
  }

  let query = supabase
    .from('appointments')
    .select(`
      *,
      clients(full_name, phone, email),
      services(name, duration, price),
      profiles!appointments_employee_id_fkey(full_name)
    `)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })

  // Filtro por rol
  if (role === 'estilista') {
    // Estilistas solo ven sus propias citas
    query = query.eq('employee_id', user.id)
  }

  // Filtros adicionales
  if (filters?.date) {
    query = query.eq('appointment_date', filters.date)
  }

  if (filters?.employeeId) {
    query = query.eq('employee_id', filters.employeeId)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query

  if (error) {
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, data: data || [] }
}