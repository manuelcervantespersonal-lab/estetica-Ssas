'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Bell, AlertTriangle, Calendar, Package } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Notification {
  id: string
  type: 'appointment' | 'stock' | 'info'
  title: string
  message: string
  time: Date
  read: boolean
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showPanel, setShowPanel] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 60000) // Actualizar cada minuto
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    const notifications: Notification[] = []
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    
    // Hora actual en formato HH:mm
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const nowTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`

    // Verificar rol del usuario
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Citas próximas (próximas 2 horas)
    const twoHoursLater = new Date()
    twoHoursLater.setHours(twoHoursLater.getHours() + 2)
    const twoHoursTime = `${twoHoursLater.getHours().toString().padStart(2, '0')}:${twoHoursLater.getMinutes().toString().padStart(2, '0')}`

    let appointmentsQuery = supabase
      .from('appointments')
      .select(`
        *,
        clients(full_name),
        services(name)
      `)
      .eq('appointment_date', today)
      .gte('appointment_time', nowTime)
      .lte('appointment_time', twoHoursTime)
      .eq('status', 'pendiente')

    // Si es estilista, solo sus citas
    if (profile?.role === 'estilista') {
      appointmentsQuery = appointmentsQuery.eq('employee_id', user.id)
    }

    const { data: upcomingAppointments } = await appointmentsQuery

    upcomingAppointments?.forEach(appt => {
      notifications.push({
        id: `appt-${appt.id}`,
        type: 'appointment',
        title: 'Cita Próxima',
        message: `${appt.clients?.full_name} - ${appt.services?.name} a las ${appt.appointment_time}`,
        time: new Date(`${appt.appointment_date}T${appt.appointment_time}`),
        read: false
      })
    })

    // Stock bajo (solo admin y cajero)
    if (profile?.role !== 'estilista') {
      const { data: inventory } = await supabase
        .from('inventory')
        .select('product_name, current_quantity, min_quantity')

      const lowStockItems = inventory?.filter(item => 
        item.current_quantity <= item.min_quantity
      ) || []

      if (lowStockItems.length > 0) {
        lowStockItems.forEach(item => {
          notifications.push({
            id: `stock-${item.product_name}`,
            type: 'stock',
            title: 'Stock Bajo',
            message: `${item.product_name}: ${item.current_quantity} unidades (mín: ${item.min_quantity})`,
            time: new Date(),
            read: false
          })
        })
      }
    }

    // Ordenar por tiempo (más recientes primero)
    notifications.sort((a, b) => b.time.getTime() - a.time.getTime())

    setNotifications(notifications)
    setUnreadCount(notifications.filter(n => !n.read).length)
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <Calendar className="w-5 h-5 text-blue-600" />
      case 'stock': return <AlertTriangle className="w-5 h-5 text-red-600" />
      default: return <Package className="w-5 h-5 text-gray-600" />
    }
  }

  return (
    <div className="relative">
      {/* Botón de notificaciones */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
      >
        <Bell className="w-6 h-6 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {showPanel && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowPanel(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-lg text-gray-900">Notificaciones</h3>
              <p className="text-sm text-gray-600">
                {unreadCount} sin leer
              </p>
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No hay notificaciones</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notif.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-sm text-gray-900">
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {notif.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {format(notif.time, "HH:mm", { locale: es })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
                    setUnreadCount(0)
                  }}
                  className="text-sm text-primary hover:text-primary-dark font-medium w-full text-center"
                >
                  Marcar todas como leídas
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}