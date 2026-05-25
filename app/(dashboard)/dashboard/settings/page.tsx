'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Select } from '@/app/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Clock, User, Save, X } from 'lucide-react'

interface Stylist {
  id: string
  full_name: string
  role: string
  available: boolean
}

interface Schedule {
  id: string
  employee_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

const daysOfWeek = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
]

export default function SettingsPage() {
  const [stylists, setStylists] = useState<Stylist[]>([])
  const [selectedStylist, setSelectedStylist] = useState<string>('')
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [editingSchedules, setEditingSchedules] = useState<Record<number, { start: string; end: string; active: boolean }>>({})
  const [hasChanges, setHasChanges] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadStylists()
  }, [])

  useEffect(() => {
    if (selectedStylist) {
      loadSchedules()
    }
  }, [selectedStylist])

  const loadStylists = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, available')
      .eq('role', 'estilista')
      .order('full_name', { ascending: true })

    if (data) setStylists(data)
  }

  const loadSchedules = async () => {
    const { data } = await supabase
      .from('employee_schedules')
      .select('*')
      .eq('employee_id', selectedStylist)
      .order('day_of_week', { ascending: true })

    if (data) {
      setSchedules(data)
      
      // Inicializar editingSchedules con los horarios existentes
      const editingData: Record<number, { start: string; end: string; active: boolean }> = {}
      data.forEach(schedule => {
        editingData[schedule.day_of_week] = {
          start: schedule.start_time,
          end: schedule.end_time,
          active: schedule.is_active,
        }
      })
      setEditingSchedules(editingData)
      setHasChanges(false)
    }
  }

  const handleScheduleChange = (day: number, field: 'start' | 'end' | 'active', value: string | boolean) => {
    setEditingSchedules(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      }
    }))
    setHasChanges(true)
  }

  const handleToggleDay = (day: number) => {
    const current = editingSchedules[day]
    if (current) {
      handleScheduleChange(day, 'active', !current.active)
    } else {
      setEditingSchedules(prev => ({
        ...prev,
        [day]: {
          start: '09:00',
          end: '18:00',
          active: true,
        }
      }))
      setHasChanges(true)
    }
  }

  const handleSaveSchedules = async () => {
    if (!selectedStylist) return

    // Eliminar horarios existentes
    await supabase
      .from('employee_schedules')
      .delete()
      .eq('employee_id', selectedStylist)

    // Insertar nuevos horarios
    const schedulesToInsert = Object.entries(editingSchedules)
      .filter(([_, schedule]) => schedule.active)
      .map(([day, schedule]) => ({
        employee_id: selectedStylist,
        day_of_week: parseInt(day),
        start_time: schedule.start,
        end_time: schedule.end,
        is_active: true,
      }))

    if (schedulesToInsert.length > 0) {
      const { error } = await supabase
        .from('employee_schedules')
        .insert(schedulesToInsert)

      if (error) {
        console.error('Error al guardar horarios:', error)
        alert('Error al guardar los horarios')
        return
      }
    }

    alert('Horarios guardados exitosamente')
    setHasChanges(false)
    loadSchedules()
  }

  const handleToggleAvailability = async (stylistId: string, currentAvailability: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ available: !currentAvailability })
      .eq('id', stylistId)

    if (error) {
      console.error('Error al actualizar disponibilidad:', error)
      return
    }

    loadStylists()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Configuración</h1>
        <p className="text-gray-600">Administra los horarios de trabajo de tus estilistas</p>
      </div>

      {/* Estilistas */}
      <Card>
        <CardHeader>
          <CardTitle>Estilistas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stylists.map((stylist) => (
              <div
                key={stylist.id}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  selectedStylist === stylist.id
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedStylist(stylist.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    <p className="font-semibold text-gray-900">{stylist.full_name}</p>
                  </div>
                  <Badge variant={stylist.available ? 'success' : 'default'}>
                    {stylist.available ? 'Disponible' : 'No disponible'}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleAvailability(stylist.id, stylist.available)
                  }}
                  className="w-full mt-2"
                >
                  {stylist.available ? 'Marcar como no disponible' : 'Marcar como disponible'}
                </Button>
              </div>
            ))}
          </div>

          {stylists.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No hay estilistas registradas
            </div>
          )}
        </CardContent>
      </Card>

      {/* Horarios */}
      {selectedStylist && (
        <Card>
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Horarios de Trabajo
              </CardTitle>
              {hasChanges && (
                <div className="flex gap-2">
                  <Button onClick={handleSaveSchedules}>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      loadSchedules()
                      setHasChanges(false)
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {daysOfWeek.map((day) => {
                const schedule = editingSchedules[day.value]
                const isActive = schedule?.active || false

                return (
                  <div
                    key={day.value}
                    className={`p-4 border rounded-xl transition-all ${
                      isActive ? 'border-primary/30 bg-primary/5' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Checkbox día */}
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => handleToggleDay(day.value)}
                          className="w-5 h-5 text-primary rounded"
                        />
                        <label className="font-medium text-gray-900 cursor-pointer select-none">
                          {day.label}
                        </label>
                      </div>

                      {/* Horarios */}
                      {isActive && (
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600">Desde:</label>
                            <input
                              type="time"
                              value={schedule?.start || '09:00'}
                              onChange={(e) => handleScheduleChange(day.value, 'start', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600">Hasta:</label>
                            <input
                              type="time"
                              value={schedule?.end || '18:00'}
                              onChange={(e) => handleScheduleChange(day.value, 'end', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                            />
                          </div>
                        </div>
                      )}

                      {!isActive && (
                        <p className="text-sm text-gray-500 italic flex-1">
                          No trabaja este día
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {hasChanges && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-sm text-yellow-800">
                  ⚠️ Tienes cambios sin guardar. No olvides hacer click en "Guardar Cambios".
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedStylist && (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            Selecciona una estilista para configurar sus horarios
          </CardContent>
        </Card>
      )}
    </div>
  )
}