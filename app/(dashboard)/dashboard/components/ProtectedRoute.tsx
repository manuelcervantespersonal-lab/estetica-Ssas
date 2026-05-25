'use client'

import { useRouteProtection } from '../middleware-check'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isChecking, hasAccess } = useRouteProtection()

  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return null
  }

  return <>{children}</>
}