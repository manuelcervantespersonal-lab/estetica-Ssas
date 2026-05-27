'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
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
  Plus,
  X,
  User,
  Scissors
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

interface DashboardStats {
  todayAppointments: number
  monthRevenue: number
  lastMonthRevenue: number
  totalClients: number
  lowStockItems: number
  nextAppointment: any
  recentAppointments: any[]
  weekRevenue: { date: string; amount: number }[]
  servicesData: { name: string; value: number; color: string }[]
}

interface Notification {
  id: string
  type: 'appointment' | 'payment' | 'stock' | 'client'
  title: string
  message: string
  time: Date
  read: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    monthRevenue: 0,
    lastMonthRevenue: 0,
    totalClients: 0,
    lowStockItems: 0,
    nextAppointment: null,
    recentAppointments: [],
    weekRevenue: [],
    servicesData: []
  })
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [searching, setSearching] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadDashboardData()
    loadNotifications()
    // Actualizar notificaciones cada minuto
    const interval = setInterval(loadNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (searchTerm.length > 2) {
      performSearch()
    } else {
      setSearchResults([])
      setShowSearchResults(false)
    }
  }, [searchTerm])

  const performSearch = async () => {
    setSearching(true)
    const results: any[] = []

    try {
      // Buscar en clientes
      const { data: clients } = await supabase
        .from('clients')
        .select('id, full_name, email, phone')
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .limit(5)

      if (clients) {
        clients.forEach(client => {
          results.push({
            type: 'client',
            id: client.id,
            title: client.full_name,
            subtitle: client.email || client.phone,
            icon: 'user',
            action: () => router.push(`/dashboard/clients?search=${encodeURIComponent(client.full_name)}`)
          })
        })
      }

      // Buscar en servicios
      const { data: services } = await supabase
        .from('services')
        .select('id, name, category, price')
        .ilike('name', `%${searchTerm}%`)
        .eq('is_active', true)
        .limit(5)

      if (services) {
        services.forEach(service => {
          results.push({
            type: 'service',
            id: service.id,
            title: service.name,
            subtitle: `${service.category} - $${service.price.toLocaleString()}`,
            icon: 'scissors',
            action: () => router.push('/dashboard/services')
          })
        })
      }

      // Buscar en citas (por nombre de cliente)
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          clients!inner(full_name),
          services(name)
        `)
        .ilike('clients.full_name', `%${searchTerm}%`)
        .order('appointment_date', { ascending: false })
        .limit(5)

      if (appointments) {
        appointments.forEach((apt: any) => {
          results.push({
            type: 'appointment',
            id: apt.id,
            title: `Cita: ${apt.clients?.full_name}`,
            subtitle: `${apt.services?.name} - ${format(new Date(apt.appointment_date), 'd MMM', { locale: es })} ${apt.appointment_time}`,
            icon: 'calendar',
            action: () => router.push('/dashboard/appointments')
          })
        })
      }

      setSearchResults(results)
      setShowSearchResults(results.length > 0)
    } catch (error) {
      console.error('Error en búsqueda:', error)
    }

    setSearching(false)
  }

  const getSearchIcon = (type: string) => {
    switch (type) {
      case 'client': return <User className="w-5 h-5 text-purple-600" />
      case 'service': return <Scissors className="w-5 h-5 text-fuchsia-600" />
      case 'appointment': return <Calendar className="w-5 h-5 text-cyan-600" />
      default: return <Search className="w-5 h-5 text-gray-600" />
    }
  }

  const loadNotifications = async () => {
    const notifs: Notification[] = []
    const today = new Date().toISOString().split('T')[0]

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // Notificación 1: Citas pendientes de hoy
      let appointmentsQuery = supabase
        .from('appointments')
        .select('*, clients(full_name)')
        .eq('appointment_date', today)
        .eq('status', 'pending')

      if (profile?.role === 'estilista') {
        appointmentsQuery = appointmentsQuery.eq('employee_id', user.id)
      }

      const { data: pendingAppts } = await appointmentsQuery

      if (pendingAppts && pendingAppts.length > 0) {
        notifs.push({
          id: 'pending-appts',
          type: 'appointment',
          title: 'Citas pendientes',
          message: `Tienes ${pendingAppts.length} cita(s) pendiente(s) por confirmar hoy`,
          time: new Date(),
          read: false
        })
      }

      // Notificación 2: Stock bajo (solo admin y cajero)
      if (profile?.role !== 'estilista') {
        const { data: inventory } = await supabase
          .from('inventory')
          .select('product_name, current_quantity, min_quantity')

        const lowStock = inventory?.filter(item => 
          item.current_quantity <= item.min_quantity
        ) || []

        if (lowStock.length > 0) {
          notifs.push({
            id: 'low-stock',
            type: 'stock',
            title: 'Stock bajo',
            message: `${lowStock.length} producto(s) con stock bajo`,
            time: new Date(),
            read: false
          })
        }

        // Notificación 3: Facturas pendientes
        const { data: pendingInvoices } = await supabase
          .from('invoices')
          .select('invoice_number')
          .eq('status', 'pending')

        if (pendingInvoices && pendingInvoices.length > 0) {
          notifs.push({
            id: 'pending-invoices',
            type: 'payment',
            title: 'Facturas pendientes',
            message: `${pendingInvoices.length} factura(s) pendiente(s) de pago`,
            time: new Date(),
            read: false
          })
        }
      }

      setNotifications(notifs)
    } catch (error) {
      console.error('Error cargando notificaciones:', error)
    }
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <Calendar className="w-5 h-5 text-purple-600" />
      case 'stock': return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'payment': return <DollarSign className="w-5 h-5 text-green-600" />
      default: return <Bell className="w-5 h-5 text-gray-600" />
    }
  }

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

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

      // Ingresos del mes actual
      let monthRevenue = 0
      let lastMonthRevenue = 0
      if (profile?.role !== 'estilista') {
        const firstDayLastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0]
        const lastDayLastMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0]

        const { data: payments } = await supabase
          .from('payments').select('amount')
          .gte('payment_date', firstDayOfMonth)
        monthRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

        const { data: lastMonthPayments } = await supabase
          .from('payments').select('amount')
          .gte('payment_date', firstDayLastMonth)
          .lte('payment_date', lastDayLastMonth)
        lastMonthRevenue = lastMonthPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
      }

      // Total de clientes
      let totalClients = 0
      if (profile?.role !== 'estilista') {
        const { count } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })

        totalClients = count || 0
      }

      // Productos con stock bajo
      let lowStockItems = 0
      if (profile?.role !== 'estilista') {
        const { data: inventory } = await supabase
          .from('inventory')
          .select('current_quantity, min_quantity')

        lowStockItems = inventory?.filter(item => item.current_quantity <= item.min_quantity).length || 0
      }

      // Ingresos de la semana
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

      // Servicios más usados este mes (datos reales)
      const colors = ['#a855f7', '#ec4899', '#8b5cf6', '#d946ef', '#c084fc']
      let servicesData: { name: string; value: number; color: string }[] = []
      if (profile?.role !== 'estilista') {
        const { data: aptsThisMonth } = await supabase
          .from('appointments')
          .select('services(name)')
          .gte('appointment_date', firstDayOfMonth)
          .eq('status', 'completed')

        if (aptsThisMonth && aptsThisMonth.length > 0) {
          const counts: Record<string, number> = {}
          aptsThisMonth.forEach((a: any) => {
            const name = a.services?.name
            if (name) counts[name] = (counts[name] || 0) + 1
          })
          const total = Object.values(counts).reduce((s, v) => s + v, 0)
          servicesData = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count], i) => ({
              name,
              value: Math.round((count / total) * 100),
              color: colors[i] || '#c084fc'
            }))
        }
      }

      setStats({
        todayAppointments: todayAppts?.length || 0,
        monthRevenue,
        lastMonthRevenue,
        totalClients,
        lowStockItems,
        nextAppointment: nextAppt,
        recentAppointments: recentAppts || [],
        weekRevenue,
        servicesData
      })

      setLoading(false)
    } catch (error) {
      console.error('Error cargando dashboard:', error)
      setLoading(false)
    }
  }

  const handleNewAppointment = () => {
    router.push('/dashboard/appointments?new=true')
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }

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
          <div className="flex items-center justify-between gap-6">
            {/* Search Bar Mejorado */}
            <div className="flex-1 max-w-xl relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Buscar clientes, citas, servicios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm"
                />
                {searching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {/* Panel de resultados de búsqueda */}
              {showSearchResults && searchResults.length > 0 && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowSearchResults(false)}
                  />
                  <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-hidden">
                    <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-fuchsia-50">
                      <p className="text-sm font-semibold text-gray-700">
                        {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} encontrado{searchResults.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {searchResults.map((result, index) => (
                        <button
                          key={`${result.type}-${result.id}-${index}`}
                          onClick={() => {
                            result.action()
                            setShowSearchResults(false)
                            setSearchTerm('')
                          }}
                          className="w-full p-4 hover:bg-gray-50 transition-colors flex items-start gap-3 border-b border-gray-100 last:border-0"
                        >
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                            {getSearchIcon(result.type)}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">
                              {result.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {result.subtitle}
                            </p>
                          </div>
                          <div className={`px-2 py-1 rounded-md text-xs font-medium shrink-0 ${
                            result.type === 'client' ? 'bg-purple-100 text-purple-700' :
                            result.type === 'service' ? 'bg-fuchsia-100 text-fuchsia-700' :
                            'bg-cyan-100 text-cyan-700'
                          }`}>
                            {result.type === 'client' ? 'Cliente' : 
                             result.type === 'service' ? 'Servicio' : 'Cita'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Notificaciones Funcionales */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-all group"
                >
                  <Bell className="w-5 h-5 text-gray-600 group-hover:text-purple-600" strokeWidth={2} />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-fuchsia-500 rounded-full border-2 border-white text-white text-[10px] font-bold flex items-center justify-center px-1">
                      {notifications.filter(n => !n.read).length > 9 ? '9+' : notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>

                {/* Panel de Notificaciones */}
                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowNotifications(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-fuchsia-50">
                        <div>
                          <h3 className="font-bold text-gray-900">Notificaciones</h3>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {notifications.filter(n => !n.read).length} sin leer
                          </p>
                        </div>
                        <button 
                          onClick={() => setShowNotifications(false)}
                          className="w-6 h-6 hover:bg-gray-100 rounded-lg flex items-center justify-center"
                        >
                          <X className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-12 text-center text-gray-500">
                            <Bell className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                            <p className="font-medium">No hay notificaciones</p>
                            <p className="text-sm text-gray-400 mt-1">Todo está al día</p>
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id} 
                              onClick={() => markAsRead(notif.id)}
                              className={`p-4 hover:bg-gray-50 border-b border-gray-100 cursor-pointer transition-colors ${
                                !notif.read ? 'bg-purple-50/50' : ''
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                  {getNotificationIcon(notif.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <p className="font-bold text-sm text-gray-900">
                                      {notif.title}
                                    </p>
                                    {!notif.read && (
                                      <div className="w-2 h-2 bg-purple-600 rounded-full shrink-0"></div>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600 leading-relaxed">{notif.message}</p>
                                  <p className="text-xs text-gray-400 mt-2">
                                    {format(notif.time, 'HH:mm', { locale: es })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <div className="p-3 border-t border-gray-100 bg-gray-50">
                          <button
                            onClick={markAllAsRead}
                            className="text-sm text-purple-600 hover:text-purple-700 font-semibold w-full text-center py-2 hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            Marcar todas como leídas
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="w-px h-8 bg-gray-200"></div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{userName}</p>
                  <p className="text-xs text-gray-500">{userRole === 'admin' ? 'Administrador' : userRole === 'cajero' ? 'Recepción' : 'Esteticista'}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Botón Nueva Cita Funcional */}
              <button 
                onClick={handleNewAppointment}
                className="ml-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center gap-2 text-sm"
              >
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
                  <div className={`flex items-center gap-1 text-sm font-semibold ${
                    stats.monthRevenue >= stats.lastMonthRevenue ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {stats.lastMonthRevenue > 0 ? (
                      <>
                        {stats.monthRevenue >= stats.lastMonthRevenue
                          ? <ArrowUpRight className="w-4 h-4" />
                          : <ArrowDownRight className="w-4 h-4" />
                        }
                        {stats.lastMonthRevenue > 0
                          ? `${stats.monthRevenue >= stats.lastMonthRevenue ? '+' : ''}${Math.round(((stats.monthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100)}%`
                          : 'Nuevo'
                        }
                      </>
                    ) : (
                      <span className="text-gray-400 text-xs">vs mes ant.</span>
                    )}
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
              <h3 className="text-lg font-bold text-gray-900 mb-2">Servicios Populares</h3>
              <p className="text-xs text-gray-400 mb-4">Citas completadas este mes</p>
              {stats.servicesData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <Scissors className="w-12 h-12 mb-3 text-gray-200" strokeWidth={1.5} />
                  <p className="text-sm">Sin citas completadas este mes</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={stats.servicesData} cx="50%" cy="50%"
                        innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {stats.servicesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, 'Participación']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {stats.servicesData.map((service, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: service.color }}></div>
                          <span className="text-sm text-gray-700 truncate max-w-[120px]">{service.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{service.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Citas Recientes Premium */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Actividad Reciente</h3>
            <button 
              onClick={() => router.push('/dashboard/appointments')}
              className="text-sm text-purple-600 hover:text-purple-700 font-semibold"
            >
              Ver todas
            </button>
          </div>
          {stats.recentAppointments.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay citas recientes</p>
          ) : (
            <div className="space-y-4">
              {stats.recentAppointments.map((appt) => (
                <div key={appt.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors cursor-pointer"
                  onClick={() => router.push('/dashboard/appointments')}
                >
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