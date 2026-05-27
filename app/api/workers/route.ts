import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Cliente con SERVICE ROLE para crear usuarios (solo en el servidor)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← Agregar esta variable en .env.local
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      cedula,
      nombres,
      apellidos,
      telefono,
      email,
      password,
      role,
      payment_type,
      commission_rate,
      fixed_salary,
      shift_rate,
      hire_date
    } = body

    // Validaciones básicas
    if (!email || !password || !nombres || !apellidos || !cedula || !role) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    // 1. Crear usuario en Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        full_name: `${nombres} ${apellidos}`,
        role
      }
    })

    if (authError) {
      console.error('Error creando usuario auth:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    // 2. Actualizar/insertar el profile con todos los datos
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        cedula,
        nombres,
        apellidos,
        full_name: `${nombres} ${apellidos}`,
        telefono,
        role,
        payment_type,
        commission_rate: commission_rate || 0,
        fixed_salary: fixed_salary || 0,
        shift_rate: shift_rate || 0,
        hire_date: hire_date || new Date().toISOString().split('T')[0],
        is_active: true
      })

    if (profileError) {
      console.error('Error creando profile:', profileError)
      // Si falla el profile, eliminar el usuario de auth
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json(
        { error: 'Error guardando datos del trabajador: ' + profileError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Trabajador ${nombres} ${apellidos} creado exitosamente`,
      userId: authUser.user.id
    })

  } catch (error: any) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PATCH: Actualizar trabajador existente
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const {
      userId,
      cedula,
      nombres,
      apellidos,
      telefono,
      role,
      payment_type,
      commission_rate,
      fixed_salary,
      shift_rate,
      is_active
    } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
    }

    // Actualizar profile
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        cedula,
        nombres,
        apellidos,
        full_name: `${nombres} ${apellidos}`,
        telefono,
        role,
        payment_type,
        commission_rate: commission_rate || 0,
        fixed_salary: fixed_salary || 0,
        shift_rate: shift_rate || 0,
        is_active
      })
      .eq('id', userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Trabajador actualizado exitosamente'
    })

  } catch (error: any) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE: Desactivar trabajador (no eliminar, solo marcar inactivo)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
    }

    // Marcar como inactivo (no eliminar para preservar historial)
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Deshabilitar login del usuario
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: 'none' // O usar 'forever' para banear
    })

    return NextResponse.json({
      success: true,
      message: 'Trabajador desactivado exitosamente'
    })

  } catch (error: any) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}