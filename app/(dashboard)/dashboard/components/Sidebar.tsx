'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Scissors, Calendar, Package, DollarSign, Settings, LogOut, Sparkles, TrendingUp, FileText, Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function Sidebar() {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    loadUserInfo()
  }, [])

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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const getNavigation = () => {
    const baseNav = [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
    ]

    if (userRole === 'admin') {
      return [
        ...baseNav,
        { name: 'Clientes', href: '/dashboard/clients', icon: Users },
        { name: 'Servicios', href: '/dashboard/services', icon: Scissors },
        { name: 'Citas', href: '/dashboard/appointments', icon: Calendar },
        { name: 'Inventario', href: '/dashboard/inventory', icon: Package },
        { name: 'Finanzas', href: '/dashboard/finances', icon: DollarSign },
        { name: 'Reportes', href: '/dashboard/reports', icon: TrendingUp },
        { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
      ]
    }

    if (userRole === 'cajero') {
      return [
        ...baseNav,
        { name: 'Clientes', href: '/dashboard/clients', icon: Users },
        { name: 'Servicios', href: '/dashboard/services', icon: Scissors },
        { name: 'Citas', href: '/dashboard/appointments', icon: Calendar },
        { name: 'Inventario', href: '/dashboard/inventory', icon: Package },
        { name: 'Finanzas', href: '/dashboard/finances', icon: DollarSign },
      ]
    }

    if (userRole === 'estilista') {
      return [
        ...baseNav,
        { name: 'Mis Citas', href: '/dashboard/appointments', icon: Calendar },
      ]
    }

    return baseNav
  }

  const navigation = getNavigation()

  const getRoleName = () => {
    if (userRole === 'admin') return 'Administrador'
    if (userRole === 'cajero') return 'Recepción'
    if (userRole === 'estilista') return 'Estilista'
    return 'Usuario'
  }

  return (
    <div className="flex h-screen w-72 flex-col bg-gradient-to-br from-[#4a1d8f] via-[#5a2ba8] to-[#6b3fc0] relative overflow-hidden">
      {/* Efectos de fondo */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.15),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(219,39,119,0.1),transparent_50%)]"></div>
      
      {/* Logo Premium */}
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

      {/* User Info Card Premium */}
      <div className="relative px-4 py-5 border-b border-white/10">
        <div className="relative group">
          <div className="absolute inset-0 bg-white/5 rounded-2xl blur-sm"></div>
          <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-400 to-purple-500 rounded-xl blur-md opacity-60"></div>
                <div className="relative w-11 h-11 bg-gradient-to-br from-fuchsia-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{userName}</p>
                <p className="text-purple-200 text-xs font-medium">{getRoleName()}</p>
              </div>
              <button className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors border border-white/20 relative group">
                <Bell className="w-4 h-4 text-white" strokeWidth={2} />
                <span className="absolute top-0 right-0 w-2 h-2 bg-fuchsia-500 rounded-full border-2 border-purple-700"></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Premium */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2 relative">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className="relative block group"
            >
              {isActive && (
                <div className="absolute inset-0 bg-white rounded-xl blur-md opacity-25"></div>
              )}
              <div
                className={`relative flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? 'bg-white text-purple-700 shadow-xl shadow-purple-900/20'
                    : 'text-white hover:bg-white/10 hover:translate-x-1'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-purple-600' : ''}`} strokeWidth={2.5} />
                {item.name}
                {isActive && (
                  <div className="ml-auto w-2 h-2 bg-purple-600 rounded-full"></div>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Logout Button Premium */}
      <div className="relative border-t border-white/10 p-4">
        <button
          onClick={handleLogout}
          className="relative w-full group"
        >
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