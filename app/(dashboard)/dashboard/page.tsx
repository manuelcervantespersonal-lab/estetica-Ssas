'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { 
  Calendar, 
  DollarSign, 
  Users, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Sparkles,
  Search,
  Bell,
  Plus
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

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

  // Datos para gráfico de servicios (ejemplo)
  const servicesData = [
    { name: 'Manicure', value: 35, color: '#a855f7' },
    { name: 'Pedicure', value: 25, color: '#ec4899' },
    { name: 'Facial', value: 20, color: '#8b5cf6' },
    { name: 'Masajes', value: 15, color: '#d946ef' },
    { name: 'Otros', value: 5, color: '#c084fc' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-purple-50/30">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30">
      {/* Topbar Premium */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-gray-200/50 shadow-sm">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Search Bar */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Buscar clientes, citas, servicios..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <button className="relative w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-all group">
                <Bell className="w-5 h-5 text-gray-600 group-hover:text-purple-600" strokeWidth={2} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-fuchsia-500 rounded-full border-2 border-white"></span>
              </button>

              <div className="w-px h-8 bg-gray-200"></div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{userName}</p>
                  <p className="text-xs text-gray-500">{userRole === 'admin' ? 'Administrador' : userRole === 'cajero' ? 'Recepción' : 'Estilista'}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              <button className="ml-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                Nueva Cita
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {getGreeting()}, {userName} 👋
            </h1>
            <p className="text-gray-600">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>
        </div>

        {/* Stats Cards Premium */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 - Citas de Hoy */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-purple-200 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Calendar className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-1 text-purple-600 text-sm font-semibold">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Hoy</span>
                </div>
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Citas de Hoy</p>
              <p className="text-3xl font-bold text-gray-900">{stats.todayAppointments}</p>
              {stats.nextAppointment && (
                <p className="text-xs text-gray-500 mt-2">
                  Próxima: {stats.nextAppointment.appointment_time}
                </p>
              )}
            </div>
          </div>

          {/* Card 2 - Ingresos (solo admin y cajero) */}
          {userRole !== 'estilista' && (
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
              <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-green-200 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                    <DollarSign className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>+12%</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm font-medium mb-1">Ingresos del Mes</p>
                <p className="text-3xl font-bold text-gray-900">${stats.monthRevenue.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Card 3 - Clientes (solo admin y cajero) */}
          {userRole !== 'estilista' && (
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
              <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-violet-200 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <Users className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex items-center gap-1 text-violet-600 text-sm font-semibold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-gray-600 text-sm font-medium mb-1">Total Clientes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalClients}</p>
              </div>
            </div>
          )}

          {/* Card 4 - Stock Bajo (solo admin y cajero) */}
          {userRole !== 'estilista' && (
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
              <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-red-200 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30">
                    <AlertTriangle className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  {stats.lowStockItems > 0 && (
                    <div className="flex items-center gap-1 text-red-600 text-sm font-semibold">
                      <ArrowDownRight className="w-4 h-4" />
                      <span>Alerta</span>
                    </div>
                  )}
                </div>
                <p className="text-gray-600 text-sm font-medium mb-1">Stock Bajo</p>
                <p className="text-3xl font-bold text-gray-900">{stats.lowStockItems}</p>
                {stats.lowStockItems > 0 && (
                  <p className="text-xs text-red-500 mt-2">Productos a reponer</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Charts Row */}
        {userRole !== 'estilista' && stats.weekRevenue.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Ingresos de la Semana</h3>
                  <p className="text-sm text-gray-500 mt-1">Últimos 7 días</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={stats.weekRevenue.map(d => ({ 
                  name: format(new Date(d.date), 'EEE', { locale: es }), 
                  ingresos: d.amount 
                }))}>
                  <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Area type="monotone" dataKey="ingresos" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Services Pie Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Servicios Populares</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={servicesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {servicesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-6 space-y-3">
                {servicesData.map((service, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: service.color }}></div>
                      <span className="text-sm text-gray-700">{service.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{service.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Citas Recientes Premium */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Actividad Reciente</h3>
            <button className="text-sm text-purple-600 hover:text-purple-700 font-semibold">
              Ver todas
            </button>
          </div>
          {stats.recentAppointments.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay citas recientes</p>
          ) : (
            <div className="space-y-4">
              {stats.recentAppointments.map((appt) => (
                <div key={appt.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-lg flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-sm">
                      {appt.clients?.full_name?.charAt(0) || 'C'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">
                      {appt.clients?.full_name || 'Cliente'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {appt.services?.name || 'Servicio'} • {appt.profiles?.full_name || 'Estilista'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {format(new Date(appt.appointment_date), 'd MMM', { locale: es })}
                    </p>
                    <p className="text-xs text-gray-500">{appt.appointment_time}</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}