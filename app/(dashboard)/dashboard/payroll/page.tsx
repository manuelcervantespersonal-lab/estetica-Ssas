'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  DollarSign, Gift, CheckCircle2, Clock, TrendingUp,
  Calendar, AlertCircle, ChevronDown, ChevronUp, Scissors
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface PayrollPayment {
  id: string
  base_amount: number
  bonus_amount: number
  deductions: number
  total_amount: number
  total_sales: number
  appointments_count: number
  status: string
  payment_method: string
  admin_notes: string
  paid_at: string
  payroll_periods: {
    name: string
    period_start: string
    period_end: string
  }
}

interface Bonus {
  id: string
  bonus_type: string
  description: string
  amount: number
  status: string
  created_at: string
}

interface PayrollConfig {
  payment_type: string
  commission_rate: number
  fixed_salary: number
  shift_rate: number
}

export default function MyPayrollPage() {
  const [payments, setPayments] = useState<PayrollPayment[]>([])
  const [bonuses, setBonuses] = useState<Bonus[]>([])
  const [config, setConfig] = useState<PayrollConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null)
  const [userRole, setUserRole] = useState('')
  const [userName, setUserName] = useState('')

  // Stats
  const [stats, setStats] = useState({
    totalEarned: 0,
    pendingAmount: 0,
    totalBonuses: 0,
    paymentsCount: 0
  })

  const supabase = createClient()

  useEffect(() => {
    initialize()
  }, [])

  const initialize = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }

    const { data: profile } = await supabase
      .from('profiles').select('role, full_name').eq('id', user.id).single()

    if (profile) {
      setUserRole(profile.role)
      setUserName(profile.full_name)
    }

    await Promise.all([
      loadPayments(user.id),
      loadBonuses(user.id),
      loadConfig(user.id)
    ])

    setLoading(false)
  }

  const loadPayments = async (userId: string) => {
    const { data } = await supabase
      .from('payroll_payments')
      .select(`
        *,
        payroll_periods(name, period_start, period_end)
      `)
      .eq('employee_id', userId)
      .order('created_at', { ascending: false })

    if (data) {
      setPayments(data as any)

      const totalEarned = data.filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + Number(p.total_amount), 0)
      const pendingAmount = data.filter(p => p.status !== 'paid' && p.status !== 'rejected')
        .reduce((sum, p) => sum + Number(p.total_amount), 0)

      setStats(prev => ({ ...prev, totalEarned, pendingAmount, paymentsCount: data.length }))
    }
  }

  const loadBonuses = async (userId: string) => {
    const { data } = await supabase
      .from('employee_bonuses')
      .select('*')
      .eq('employee_id', userId)
      .order('created_at', { ascending: false })

    if (data) {
      setBonuses(data)
      const totalBonuses = data.filter(b => b.status === 'paid')
        .reduce((sum, b) => sum + Number(b.amount), 0)
      setStats(prev => ({ ...prev, totalBonuses }))
    }
  }

  const loadConfig = async (userId: string) => {
    const { data } = await supabase
      .from('employee_payroll_config')
      .select('*')
      .eq('employee_id', userId)
      .single()

    if (data) setConfig(data)
  }

  const getStatusColor = (status: string) => ({
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-blue-100 text-blue-700 border-blue-200',
    paid: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200'
  }[status] || 'bg-gray-100 text-gray-700')

  const getStatusLabel = (status: string) => ({
    pending: 'Pendiente',
    approved: 'Aprobado',
    paid: 'Pagado',
    rejected: 'Rechazado'
  }[status] || status)

  const getBonusTypeLabel = (type: string) => ({
    performance: '⭐ Desempeño',
    attendance: '✅ Asistencia',
    sales_goal: '🎯 Meta de ventas',
    tip: '💝 Propina',
    special: '🎁 Especial'
  }[type] || type)

  const getPaymentTypeLabel = (type: string) => ({
    commission: '% Comisión por ventas',
    fixed: 'Salario fijo',
    shifts: 'Por turno trabajado'
  }[type] || type)

  const getPaymentMethodLabel = (method: string) => ({
    cash: 'Efectivo',
    transfer: 'Transferencia',
    check: 'Cheque'
  }[method] || method)

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 p-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mis Pagos y Bonos</h1>
        <p className="text-gray-600 mt-1">Consulta tu historial de pagos y bonificaciones</p>
      </div>

      {/* Mi tipo de compensación */}
      {config && (
        <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">Tu tipo de compensación</p>
              <p className="text-2xl font-bold">{getPaymentTypeLabel(config.payment_type)}</p>
              {config.payment_type === 'commission' && (
                <p className="text-purple-100 mt-1">
                  Recibes el <span className="text-white font-bold text-lg">{config.commission_rate}%</span> de tus ventas totales
                </p>
              )}
              {config.payment_type === 'fixed' && (
                <p className="text-purple-100 mt-1">
                  <span className="text-white font-bold text-lg">${Number(config.fixed_salary).toLocaleString()}</span> por período
                </p>
              )}
              {config.payment_type === 'shifts' && (
                <p className="text-purple-100 mt-1">
                  <span className="text-white font-bold text-lg">${Number(config.shift_rate).toLocaleString()}</span> por turno trabajado
                </p>
              )}
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <DollarSign className="w-9 h-9 text-white" strokeWidth={2.5} />
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4">
            <CheckCircle2 className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <p className="text-gray-600 text-sm font-medium">Total Recibido</p>
          <p className="text-2xl font-bold text-gray-900">${stats.totalEarned.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <p className="text-gray-600 text-sm font-medium">Por Recibir</p>
          <p className="text-2xl font-bold text-gray-900">${stats.pendingAmount.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center mb-4">
            <Gift className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <p className="text-gray-600 text-sm font-medium">Bonos Recibidos</p>
          <p className="text-2xl font-bold text-gray-900">${stats.totalBonuses.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <p className="text-gray-600 text-sm font-medium">Períodos de Pago</p>
          <p className="text-2xl font-bold text-gray-900">{stats.paymentsCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Historial de Pagos */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Historial de Pagos</h2>
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-16">
                <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" strokeWidth={1.5} />
                <p className="text-gray-500 font-medium">No hay pagos registrados aún</p>
                <p className="text-gray-400 text-sm mt-1">Los pagos aparecerán cuando el administrador procese la nómina</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {payments.map(payment => (
                  <div key={payment.id}>
                    {/* Fila principal */}
                    <div
                      className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setExpandedPayment(expandedPayment === payment.id ? null : payment.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900">{payment.payroll_periods?.name}</p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {payment.payroll_periods?.period_start && format(new Date(payment.payroll_periods.period_start), "d MMM", { locale: es })} —{' '}
                            {payment.payroll_periods?.period_end && format(new Date(payment.payroll_periods.period_end), "d MMM yyyy", { locale: es })}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xl font-bold text-gray-900">
                              ${Number(payment.total_amount).toLocaleString()}
                            </p>
                            {payment.status === 'paid' && payment.paid_at && (
                              <p className="text-xs text-gray-500">
                                Pagado: {format(new Date(payment.paid_at), "d MMM yyyy", { locale: es })}
                              </p>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getStatusColor(payment.status)}`}>
                            {getStatusLabel(payment.status)}
                          </span>
                          {expandedPayment === payment.id
                            ? <ChevronUp className="w-4 h-4 text-gray-400" />
                            : <ChevronDown className="w-4 h-4 text-gray-400" />
                          }
                        </div>
                      </div>
                    </div>

                    {/* Detalle expandible */}
                    {expandedPayment === payment.id && (
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="text-center p-3 bg-white rounded-xl">
                            <Scissors className="w-5 h-5 text-purple-600 mx-auto mb-1" strokeWidth={2} />
                            <p className="text-xl font-bold text-gray-900">{payment.appointments_count}</p>
                            <p className="text-xs text-gray-500">Citas</p>
                          </div>
                          <div className="text-center p-3 bg-white rounded-xl">
                            <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" strokeWidth={2} />
                            <p className="text-xl font-bold text-gray-900">${Number(payment.total_sales).toLocaleString()}</p>
                            <p className="text-xs text-gray-500">Mis ventas</p>
                          </div>
                          <div className="text-center p-3 bg-white rounded-xl">
                            <DollarSign className="w-5 h-5 text-blue-600 mx-auto mb-1" strokeWidth={2} />
                            <p className="text-xl font-bold text-gray-900">${Number(payment.base_amount).toLocaleString()}</p>
                            <p className="text-xs text-gray-500">Pago base</p>
                          </div>
                          <div className="text-center p-3 bg-white rounded-xl">
                            <Gift className="w-5 h-5 text-fuchsia-600 mx-auto mb-1" strokeWidth={2} />
                            <p className="text-xl font-bold text-gray-900">
                              +${Number(payment.bonus_amount).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">Bonos</p>
                          </div>
                        </div>

                        {/* Método de pago */}
                        <div className="flex items-center justify-between bg-white rounded-xl p-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-700">Método de pago:</p>
                            <p className="text-gray-900">{getPaymentMethodLabel(payment.payment_method)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-700">Total:</p>
                            <p className="text-2xl font-bold text-purple-600">
                              ${Number(payment.total_amount).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {payment.admin_notes && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                            <p className="text-xs font-semibold text-blue-700 mb-1">Nota del administrador:</p>
                            <p className="text-sm text-blue-800">{payment.admin_notes}</p>
                          </div>
                        )}

                        {payment.status === 'pending' && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" strokeWidth={2} />
                            <p className="text-xs text-amber-800">
                              Este pago está pendiente de aprobación por el administrador.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bonos */}
        <div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Mis Bonos</h2>
            </div>

            {bonuses.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-gray-500 text-sm">No hay bonos registrados</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {bonuses.map(bonus => (
                  <div key={bonus.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">
                          {getBonusTypeLabel(bonus.bonus_type)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 truncate">{bonus.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(bonus.created_at), "d MMM yyyy", { locale: es })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-green-600 text-lg">
                          +${Number(bonus.amount).toLocaleString()}
                        </p>
                        <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold border ${getStatusColor(bonus.status)}`}>
                          {getStatusLabel(bonus.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}