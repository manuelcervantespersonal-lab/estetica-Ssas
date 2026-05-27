'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, Users, Scissors, Calendar, Package, DollarSign, 
  Settings, LogOut, Sparkles, TrendingUp, FileText, Bell, 
  X, AlertTriangle, Banknote, ChevronDown, ChevronRight,
  CalendarPlus, CalendarCheck, BarChart3, Receipt, 
  ShoppingBag, Building2, UserCog, CalendarClock
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Notification {
  id: string
  type: 'appointment' | 'stock' | 'invoice'
  title: string
  message: string
  time: Date
  read: boolean
}

interface NavItem {
  name: string
  href: string
  icon: any
  children?: { name: string; href: string; icon: any }[]
}

export default function Sidebar() {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Citas'])
  const supabase = createClient()

  useEffect(() => {
    loadUserInfo()
    loadNotifications()
    const interval = setInterval(loadNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  // Auto-expandir si la ruta activa está en un submenú
  useEffect(() => {
    if (pathname.includes('/appointments')) {
      setExpandedMenus(prev => prev.includes('Citas') ? prev : [...prev, 'Citas'])
    }
    if (pathname.includes('/finances') || pathname.includes('/reports') || pathname.includes('/payroll')) {
      setExpandedMenus(prev => prev.includes('Finanzas') ? prev : [...prev, 'Finanzas'])
    }
    if (pathname.includes('/services') || pathname.includes('/inventory')) {
      setExpandedMenus(prev => prev.includes('Catálogo') ? prev : [...prev, 'Catálogo'])
    }
    if (pathname.includes('/settings')) {
      setExpandedMenus(prev => prev.includes('Configuración') ? prev : [...prev, 'Configuración'])
    }
  }, [pathname])

  const loadUserInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()
      if (profile) {
        setUserRole(profile.role)
        setUserName(profile.full_name || user.email?.split('@')[0] || 'Usuario')
      }
    }
  }

  const loadNotifications = async () => {
    const notifs: Notification[] = []
    const today = new Date().toISOString().split('T')[0]
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

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

      if (profile?.role !== 'estilista') {
        const { data: inventory } = await supabase
          .from('inventory')
          .select('product_name, current_quantity, min_quantity')
        const lowStock = inventory?.filter(item => item.current_quantity <= item.min_quantity) || []
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

        const { data: pendingInvoices } = await supabase
          .from('invoices')
          .select('invoice_number')
          .eq('status', 'pending')
        if (pendingInvoices && pendingInvoices.length > 0) {
          notifs.push({
            id: 'pending-invoices',
            type: 'invoice',
            title: 'Facturas pendientes',
            message: `${pendingInvoices.length} factura(s) pendiente(s) de pago`,
            time: new Date(),
            read: false
          })
        }
      }

      setNotifications(notifs)
      setUnreadCount(notifs.filter(n => !n.read).length)
    } catch (error) {
      console.error('Error cargando notificaciones:', error)
    }
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <Calendar className="w-5 h-5 text-purple-600" />
      case 'stock': return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'invoice': return <DollarSign className="w-5 h-5 text-green-600" />
      default: return <Bell className="w-5 h-5 text-gray-600" />
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const toggleMenu = (name: string) => {
    setExpandedMenus(prev =>
      prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]
    )
  }

  // Item de citas con submenú (igual para todos los roles)
  const citasItem: NavItem = {
    name: 'Citas',
    href: '/dashboard/appointments',
    icon: Calendar,
    children: [
      { name: 'Agendar Cita', href: '/dashboard/appointments/new', icon: CalendarPlus },
      { name: 'Ver Citas', href: '/dashboard/appointments/calendar', icon: CalendarCheck },
    ]
  }

  const finanzasItem: NavItem = {
    name: 'Finanzas',
    href: '/dashboard/finances',
    icon: TrendingUp,
    children: [
      { name: 'Reportes', href: '/dashboard/reports', icon: BarChart3 },
      { name: 'Nómina', href: '/dashboard/settings/payroll', icon: Banknote },
      { name: 'Gastos', href: '/dashboard/finances', icon: Receipt },
    ]
  }

  const catalogoItem: NavItem = {
    name: 'Servicios y Stock',
    href: '/dashboard/services',
    icon: ShoppingBag,
    children: [
      { name: 'Servicios', href: '/dashboard/services', icon: Sparkles },
      { name: 'Inventario', href: '/dashboard/inventory', icon: Package },
    ]
  }

  const configuracionItem: NavItem = {
    name: 'Gestión',
    href: '/dashboard/settings',
    icon: Building2,
    children: [
      { name: 'Empleados', href: '/dashboard/settings/workers', icon: UserCog },
      { name: 'Disponibilidad', href: '/dashboard/settings', icon: CalendarClock },
    ]
  }

  const getNavigation = (): NavItem[] => {
    const baseNav: NavItem[] = [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
    ]

    if (userRole === 'admin') {
      return [
        ...baseNav,
        { name: 'Clientes', href: '/dashboard/clients', icon: Users },
        catalogoItem,
        citasItem,
        { name: 'Facturación', href: '/dashboard/invoicing', icon: FileText },
        finanzasItem,
        configuracionItem,
      ]
    }

    if (userRole === 'cajero') {
      return [
        ...baseNav,
        { name: 'Clientes', href: '/dashboard/clients', icon: Users },
        { name: 'Servicios', href: '/dashboard/services', icon: Scissors },
        citasItem,
        { name: 'Inventario', href: '/dashboard/inventory', icon: Package },
        { name: 'Facturación', href: '/dashboard/invoicing', icon: FileText },
        { name: 'Finanzas', href: '/dashboard/finances', icon: DollarSign },
        { name: 'Reportes', href: '/dashboard/reports', icon: TrendingUp },
        { name: 'Mis Pagos', href: '/dashboard/payroll', icon: Banknote },
      ]
    }

    if (userRole === 'estilista') {
      return [
        ...baseNav,
        { name: 'Clientes', href: '/dashboard/clients', icon: Users },
        citasItem,
        { name: 'Mis Pagos', href: '/dashboard/payroll', icon: Banknote },
      ]
    }

    return baseNav
  }

  const navigation = getNavigation()

  const getRoleName = () => {
    if (userRole === 'admin') return 'Administrador'
    if (userRole === 'cajero') return 'Recepción'
    if (userRole === 'estilista') return 'Esteticista'
    return 'Usuario'
  }

  const isPathActive = (href: string) => pathname === href
  const isParentActive = (item: NavItem) =>
    pathname === item.href || item.children?.some(c => pathname === c.href)

  return (
    <div className="flex h-screen w-72 flex-col bg-gradient-to-br from-[#4a1d8f] via-[#5a2ba8] to-[#6b3fc0] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.15),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(219,39,119,0.1),transparent_50%)]"></div>

      {/* Logo */}
      <div className="relative flex h-20 items-center gap-3 px-6 border-b border-white/10">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-2xl blur-md opacity-75 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative w-12 h-12 bg-gradient-to-br from-fuchsia-500 via-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
            <Sparkles className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Estética Pro</h1>
          <p className="text-xs text-purple-200 font-medium">{getRoleName()}</p>
        </div>
      </div>

      {/* User Info */}
      <div className="relative px-4 py-5 border-b border-white/10">
        <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 bg-gradient-to-br from-fuchsia-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">{userName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{userName}</p>
              <p className="text-purple-200 text-xs font-medium">{getRoleName()}</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors border border-white/20"
              >
                <Bell className="w-4 h-4 text-white" strokeWidth={2} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-fuchsia-500 rounded-full border-2 border-purple-700 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1 relative">
        {navigation.map((item) => {
          const Icon = item.icon
          const hasChildren = item.children && item.children.length > 0
          const isExpanded = expandedMenus.includes(item.name)
          const parentActive = isParentActive(item)

          if (hasChildren) {
            return (
              <div key={item.name}>
                {/* Item padre con submenú */}
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={`w-full relative flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-300 ${
                    parentActive
                      ? 'bg-white/20 text-white'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={2.5} />
                  <span className="flex-1 text-left">{item.name}</span>
                  {isExpanded
                    ? <ChevronDown className="w-4 h-4 opacity-70" strokeWidth={2} />
                    : <ChevronRight className="w-4 h-4 opacity-70" strokeWidth={2} />
                  }
                </button>

                {/* Submenú */}
                {isExpanded && (
                  <div className="mt-1 ml-4 space-y-1">
                    {item.children!.map(child => {
                      const ChildIcon = child.icon
                      const childActive = isPathActive(child.href)
                      return (
                        <Link key={child.name} href={child.href} className="relative block">
                          {childActive && (
                            <div className="absolute inset-0 bg-white rounded-xl blur-md opacity-25"></div>
                          )}
                          <div className={`relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                            childActive
                              ? 'bg-white text-purple-700 shadow-xl shadow-purple-900/20'
                              : 'text-white/80 hover:bg-white/10 hover:text-white hover:translate-x-1'
                          }`}>
                            <ChildIcon className={`h-4 w-4 ${childActive ? 'text-purple-600' : ''}`} strokeWidth={2.5} />
                            {child.name}
                            {childActive && <div className="ml-auto w-2 h-2 bg-purple-600 rounded-full"></div>}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          // Item normal sin submenú
          const isActive = isPathActive(item.href)
          return (
            <Link key={item.name} href={item.href} className="relative block group">
              {isActive && <div className="absolute inset-0 bg-white rounded-xl blur-md opacity-25"></div>}
              <div className={`relative flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-300 ${
                isActive
                  ? 'bg-white text-purple-700 shadow-xl shadow-purple-900/20'
                  : 'text-white hover:bg-white/10 hover:translate-x-1'
              }`}>
                <Icon className={`h-5 w-5 ${isActive ? 'text-purple-600' : ''}`} strokeWidth={2.5} />
                {item.name}
                {isActive && <div className="ml-auto w-2 h-2 bg-purple-600 rounded-full"></div>}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Panel Notificaciones */}
      {showNotifications && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setShowNotifications(false)} />
          <div className="fixed left-72 top-32 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-fuchsia-50">
              <div>
                <h3 className="font-bold text-lg text-gray-900">Notificaciones</h3>
                <p className="text-sm text-gray-600">{unreadCount} sin leer</p>
              </div>
              <button onClick={() => setShowNotifications(false)}
                className="w-8 h-8 hover:bg-gray-100 rounded-lg flex items-center justify-center transition-colors">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Bell className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No hay notificaciones</p>
                  <p className="text-sm text-gray-400 mt-1">Todo está al día</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map(notif => (
                    <div key={notif.id} onClick={() => markAsRead(notif.id)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${!notif.read ? 'bg-purple-50/50' : ''}`}>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-1 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-sm text-gray-900">{notif.title}</p>
                            {!notif.read && <span className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0 mt-1.5" />}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-2">{format(notif.time, "HH:mm", { locale: es })}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-100 bg-gray-50">
                <button onClick={markAllAsRead}
                  className="text-sm text-purple-600 hover:text-purple-700 font-semibold w-full text-center py-2 hover:bg-purple-50 rounded-lg transition-colors">
                  Marcar todas como leídas
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Logout */}
      <div className="relative border-t border-white/10 p-4">
        <button onClick={handleLogout} className="relative w-full group">
          <div className="absolute inset-0 bg-white/5 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-white/20">
            <LogOut className="h-5 w-5" strokeWidth={2.5} />
            Cerrar Sesión
          </div>
        </button>
      </div>
    </div>
  )
}