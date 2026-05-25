'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Scissors, Calendar, Package, DollarSign, Settings, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Notifications from './Notifications'
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

  // Definir navegación según rol
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
    <div className="flex h-screen w-64 flex-col bg-gradient-to-b from-primary-dark to-primary">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-white/10">
        <div className="text-3xl">💜</div>
        <div>
          <h1 className="text-xl font-bold text-white">Estética Pro</h1>
          <p className="text-xs text-primary-light">{getRoleName()}</p>
        </div>
      </div>

      {/* User Info */}
<div className="px-6 py-4 border-b border-white/10">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
      <span className="text-white font-semibold text-lg">
        {userName.charAt(0).toUpperCase()}
      </span>
    </div>
    <div className="flex-1">
      <p className="text-white font-medium text-sm">{userName}</p>
      <p className="text-primary-light text-xs">{getRoleName()}</p>
    </div>
    {/* AGREGAR AQUÍ */}
    <Notifications />
  </div>
</div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white text-primary shadow-lg'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-all"
        >
          <LogOut className="h-5 w-5" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  )
}