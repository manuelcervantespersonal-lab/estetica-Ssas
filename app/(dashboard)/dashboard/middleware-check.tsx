'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface PermissionsConfig {
  [key: string]: string[]
}

const ROUTE_PERMISSIONS: PermissionsConfig = {
  '/dashboard': ['admin', 'cajero', 'estilista'],
  '/dashboard/clients': ['admin', 'cajero'],
  '/dashboard/services': ['admin', 'cajero'],
  '/dashboard/appointments': ['admin', 'cajero', 'estilista'],
  '/dashboard/inventory': ['admin', 'cajero'],
  '/dashboard/finances': ['admin', 'cajero'],
  '/dashboard/settings': ['admin'],
}

export function useRouteProtection() {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const supabase = createClient()

  const checkAccess = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile) {
        router.push('/login')
        return
      }

      const allowedRoles = ROUTE_PERMISSIONS[pathname] || []
      
      if (!allowedRoles.includes(profile.role)) {
        if (profile.role === 'estilista') {
          router.push('/dashboard/appointments')
        } else {
          router.push('/dashboard')
        }
        setHasAccess(false)
      } else {
        setHasAccess(true)
      }
    } catch (error) {
      console.error('Error verificando permisos:', error)
      router.push('/login')
    } finally {
      setIsChecking(false)
    }
  }, [pathname, router, supabase])

  useEffect(() => {
    checkAccess()
  }, [checkAccess])

  return { isChecking, hasAccess }
}