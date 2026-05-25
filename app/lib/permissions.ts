import { createClient } from '@/lib/supabase'

export type UserRole = 'admin' | 'cajero' | 'estilista'

export interface Permissions {
  canCreateAppointment: boolean
  canEditAppointment: boolean
  canDeleteAppointment: boolean
  canViewAllAppointments: boolean
  canManageServices: boolean
  canManageInventory: boolean
  canViewFinances: boolean
  canManageEmployees: boolean
  canAssignToOthers: boolean // Puede agendar para otros estilistas
}

const ROLE_PERMISSIONS: Record<UserRole, Permissions> = {
  admin: {
    canCreateAppointment: true,
    canEditAppointment: true,
    canDeleteAppointment: true,
    canViewAllAppointments: true,
    canManageServices: true,
    canManageInventory: true,
    canViewFinances: true,
    canManageEmployees: true,
    canAssignToOthers: true,
  },
  cajero: {
    canCreateAppointment: true,
    canEditAppointment: true,
    canDeleteAppointment: false, // NO puede eliminar
    canViewAllAppointments: true,
    canManageServices: false,
    canManageInventory: true,
    canViewFinances: false, // NO ve finanzas
    canManageEmployees: false,
    canAssignToOthers: true, // Puede agendar para cualquier estilista
  },
  estilista: {
    canCreateAppointment: true,
    canEditAppointment: true,
    canDeleteAppointment: false,
    canViewAllAppointments: false, // Solo ve sus propias citas
    canManageServices: false,
    canManageInventory: false,
    canViewFinances: false, // NO ve finanzas
    canManageEmployees: false,
    canAssignToOthers: false, // Solo puede agendarse a sí misma
  },
}

export async function getUserRole(): Promise<UserRole | null> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role as UserRole || null
}

export async function getUserPermissions(): Promise<Permissions | null> {
  const role = await getUserRole()
  if (!role) return null

  return ROLE_PERMISSIONS[role]
}

export function getPermissionsByRole(role: UserRole): Permissions {
  return ROLE_PERMISSIONS[role]
}

export async function checkPermission(
  permission: keyof Permissions
): Promise<boolean> {
  const permissions = await getUserPermissions()
  if (!permissions) return false

  return permissions[permission]
}