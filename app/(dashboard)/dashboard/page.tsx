'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Calendar, DollarSign, Users, Package, TrendingUp, Clock, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface DashboardStats {
  todayAppointments: number
  monthRevenue: number
  totalClients: number
  lowStockItems: number
  nextAppointment: any
  recentAppointments: any[]
  weekRevenue: { date: string; amount: number }[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    monthRevenue: 0,
    totalClients: 0,
    lowStockItems: 0,
    nextAppointment: null,
    recentAppointments: [],
    weekRevenue: []
  })
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('')
  const [userName, setUserName] = useState<string>('')

  const supabase = createClient()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Obtener rol del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserRole(profile.role)
        setUserName(profile.full_name || user.email?.split('@')[0] || 'Usuario')
      }

      const today = new Date().toISOString().split('T')[0]
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

      // Citas de hoy
      let appointmentsQuery = supabase
        .from('appointments')
        .select(`
          *,
          clients(full_name),
          services(name),
          profiles!appointments_employee_id_fkey(full_name)
        `)
        .eq('appointment_date', today)

      // Si es estilista, solo sus citas
      if (profile?.role === 'estilista') {
        appointmentsQuery = appointmentsQuery.eq('employee_id', user.id)
      }

      const { data: todayAppts } = await appointmentsQuery

      // Próxima cita
      const now = new Date().toTimeString().split(' ')[0].substring(0, 5)
      const nextAppt = todayAppts?.find(a => a.appointment_time >= now) || null

      // Citas recientes
      const { data: recentAppts } = await supabase
        .from('appointments')
        .select(`
          *,
          clients(full_name),
          services(name),
          profiles!appointments_employee_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      // Ingresos del mes (solo admin y cajero)
      let monthRevenue = 0
      if (profile?.role !== 'estilista') {
        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .gte('payment_date', firstDayOfMonth)

        monthRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
      }

      // Total de clientes (solo admin y cajero)
      let totalClients = 0
      if (profile?.role !== 'estilista') {
        const { count } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })

        totalClients = count || 0
      }

      // Productos con stock bajo (solo admin y cajero)
      let lowStockItems = 0
      if (profile?.role !== 'estilista') {
        const { data: inventory } = await supabase
          .from('inventory')
          .select('current_quantity, min_quantity')

        lowStockItems = inventory?.filter(item => item.current_quantity <= item.min_quantity).length || 0
      }

      // Ingresos de la semana (solo admin y cajero)
      let weekRevenue: { date: string; amount: number }[] = []
      if (profile?.role !== 'estilista') {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - (6 - i))
          return d.toISOString().split('T')[0]
        })

        const revenuePromises = last7Days.map(async (date) => {
          const { data } = await supabase
            .from('payments')
            .select('amount')
            .eq('payment_date', date)

          const total = data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
          return { date, amount: total }
        })

        weekRevenue = await Promise.all(revenuePromises)
      }

      setStats({
        todayAppointments: todayAppts?.length || 0,
        monthRevenue,
        totalClients,
        lowStockItems,
        nextAppointment: nextAppt,
        recentAppointments: recentAppts || [],
        weekRevenue
      })

      setLoading(false)
    } catch (error) {
      console.error('Error cargando dashboard:', error)
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          {getGreeting()}, {userName}
        </h1>
        <p className="text-gray-600">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Citas de Hoy
              </CardTitle>
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats.todayAppointments}</p>
            {stats.nextAppointment && (
              <p className="text-sm text-gray-600 mt-1">
                Próxima: {stats.nextAppointment.appointment_time}
              </p>
            )}
          </CardContent>
        </Card>

        {userRole !== 'estilista' && (
          <>
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Ingresos del Mes
                  </CardTitle>
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  ${stats.monthRevenue.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Clientes
                  </CardTitle>
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">{stats.totalClients}</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Stock Bajo
                  </CardTitle>
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">{stats.lowStockItems}</p>
                {stats.lowStockItems > 0 && (
                  <p className="text-sm text-gray-600 mt-1">Productos a reponer</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Citas Recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentAppointments.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay citas recientes</p>
          ) : (
            <div className="space-y-4">
              {stats.recentAppointments.map((appt) => (
                <div key={appt.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {appt.clients?.full_name || 'Cliente'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {appt.services?.name || 'Servicio'} • {appt.profiles?.full_name || 'Estilista'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {format(new Date(appt.appointment_date), 'd MMM', { locale: es })}
                    </p>
                    <p className="text-sm text-gray-600">{appt.appointment_time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfica simple de ingresos de la semana (solo admin y cajero) */}
      {userRole !== 'estilista' && stats.weekRevenue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ingresos de los Últimos 7 Días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2">
              {stats.weekRevenue.map((day, index) => {
                const maxRevenue = Math.max(...stats.weekRevenue.map(d => d.amount))
                const height = maxRevenue > 0 ? (day.amount / maxRevenue) * 100 : 0

                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-primary/20 rounded-t-lg relative group cursor-pointer hover:bg-primary/30 transition-colors"
                         style={{ height: `${height}%`, minHeight: day.amount > 0 ? '20px' : '0' }}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        ${day.amount.toLocaleString()}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600">
                      {format(new Date(day.date), 'EEE', { locale: es })}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}