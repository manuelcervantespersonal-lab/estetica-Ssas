'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export interface ScheduleInput {
  employeeId: string
  dayOfWeek: number // 0-6 (0 = domingo)
  startTime: string // "09:00"
  endTime: string // "18:00"
  isActive?: boolean
}

/**
 * Crear o actualizar horario de una estilista
 */
export async function upsertScheduleAction(input: ScheduleInput) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  // Validar que end_time > start_time
  if (input.endTime <= input.startTime) {
    return { 
      success: false, 
      error: 'La hora de fin debe ser posterior a la hora de inicio' 
    }
  }

  // Verificar si ya existe un horario para ese día
  const { data: existing } = await supabase
    .from('employee_schedules')
    .select('id')
    .eq('employee_id', input.employeeId)
    .eq('day_of_week', input.dayOfWeek)
    .single()

  let result

  if (existing) {
    // Actualizar existente
    result = await supabase
      .from('employee_schedules')
      .update({
        start_time: input.startTime,
        end_time: input.endTime,
        is_active: input.isActive ?? true,
      })
      .eq('id', existing.id)
      .select()
      .single()
  } else {
    // Crear nuevo
    result = await supabase
      .from('employee_schedules')
      .insert({
        employee_id: input.employeeId,
        day_of_week: input.dayOfWeek,
        start_time: input.startTime,
        end_time: input.endTime,
        is_active: input.isActive ?? true,
      })
      .select()
      .single()
  }

  if (result.error) {
    return { success: false, error: result.error.message }
  }

  revalidatePath('/dashboard/settings/schedules')
  return { success: true, data: result.data }
}

/**
 * Obtener horarios de una estilista
 */
export async function getSchedulesByEmployeeAction(employeeId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('employee_schedules')
    .select('*')
    .eq('employee_id', employeeId)
    .order('day_of_week', { ascending: true })

  if (error) {
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, data: data || [] }
}

/**
 * Obtener todas las estilistas con sus horarios
 */
export async function getAllStylistsWithSchedulesAction() {
  const supabase = createClient()

  const { data: stylists, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      available,
      employee_schedules(*)
    `)
    .eq('role', 'estilista')
    .order('full_name', { ascending: true })

  if (error) {
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, data: stylists || [] }
}

/**
 * Activar/desactivar disponibilidad global de una estilista
 */
export async function toggleAvailabilityAction(
  employeeId: string,
  available: boolean
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ available })
    .eq('id', employeeId)
    .eq('role', 'estilista')
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/settings/schedules')
  return { success: true, data }
}

/**
 * Eliminar horario de un día específico
 */
export async function deleteScheduleAction(scheduleId: string) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autenticado' }
  }

  const { error } = await supabase
    .from('employee_schedules')
    .delete()
    .eq('id', scheduleId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/settings/schedules')
  return { success: true }
}

/**
 * Crear horarios por defecto para una estilista (Lun-Vie 9-18, Sáb 9-14)
 */
export async function createDefaultSchedulesAction(employeeId: string) {
  const supabase = createClient()

  const defaultSchedules = [
    { day: 1, start: '09:00', end: '18:00' }, // Lunes
    { day: 2, start: '09:00', end: '18:00' }, // Martes
    { day: 3, start: '09:00', end: '18:00' }, // Miércoles
    { day: 4, start: '09:00', end: '18:00' }, // Jueves
    { day: 5, start: '09:00', end: '18:00' }, // Viernes
    { day: 6, start: '09:00', end: '14:00' }, // Sábado
  ]

  const schedules = defaultSchedules.map(s => ({
    employee_id: employeeId,
    day_of_week: s.day,
    start_time: s.start,
    end_time: s.end,
    is_active: true,
  }))

  const { data, error } = await supabase
    .from('employee_schedules')
    .insert(schedules)
    .select()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/settings/schedules')
  return { success: true, data }
}