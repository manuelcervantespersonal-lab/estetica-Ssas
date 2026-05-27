'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  DollarSign, History, Settings, Plus, X, Save,
  CheckCircle2, Clock, ChevronDown, ChevronUp,
  Banknote, Percent, Gift, Eye, Calendar
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Employee {
  id: string
  full_name: string
  nombres: string
  apellidos: string
  role: string
  payment_type: string
  commission_rate: number
  fixed_salary: number
  shift_rate: number
}

interface PaymentHistory {
  id: string
  employee_id: string
  period_name: string
  period_start: string
  period_end: string
  total_sales: number
  base_amount: number
  bonus_amount: number
  total_amount: number
  payment_method: string
  status: string
  paid_at: string
  notes: string
  created_at: string
}

interface Bonus {
  id: string
  employee_id: string
  bonus_type: string
  description: string
  amount: number
  status: string
  created_at: string
  profiles?: { full_name: string }
}

type ActivePanel = { employeeId: string; panel: 'history' | 'config' | 'pay' | 'bonus' } | null

export default function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [histories, setHistories] = useState<Record<string, PaymentHistory[]>>({})
  const [bonuses, setBonuses] = useState<Bonus[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)

  const [configForm, setConfigForm] = useState({
    payment_type: 'commission',
    commission_rate: 0,
    fixed_salary: 0,
    shift_rate: 0,
  })

  const [payForm, setPayForm] = useState({
    period_name: '',
    period_start: '',
    period_end: '',
    total_sales: 0,
    base_amount: 0,
    bonus_amount: 0,
    total_amount: 0,
    payment_method: 'transfer',
    notes: ''
  })

  const [bonusForm, setBonusForm] = useState({
    employee_id: '',
    bonus_type: 'performance',
    description: '',
    amount: 0
  })

  const [showBonusModal, setShowBonusModal] = useState(false)
  const [showAllBonuses, setShowAllBonuses] = useState(false)

  const supabase = createClient()

  useEffect(() => { initialize() }, [])

  const initialize = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') { window.location.href = '/dashboard'; return }
    await Promise.all([loadEmployees(), loadBonuses()])
    setLoading(false)
  }

  const loadEmployees = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, nombres, apellidos, role, payment_type, commission_rate, fixed_salary, shift_rate')
      .in('role', ['estilista', 'cajero'])
      .eq('is_active', true)
      .order('apellidos')
    if (data) {
      setEmployees(data)
      for (const emp of data) loadHistory(emp.id)
    }
  }

  const loadHistory = async (employeeId: string) => {
    const { data } = await supabase
      .from('payroll_payments')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(10)
    if (data) setHistories(prev => ({ ...prev, [employeeId]: data }))
  }

  const loadBonuses = async () => {
  // Primero cargar los bonos
  const { data: bonusData, error } = await supabase
    .from('employee_bonuses')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error bonos:', error)
    return
  }

  if (!bonusData || bonusData.length === 0) {
    setBonuses([])
    return
  }

  // Cargar nombres de empleados por separado
  const employeeIds = [...new Set(bonusData.map(b => b.employee_id))]
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', employeeIds)

  // Combinar manualmente
  const enriched = bonusData.map(bonus => ({
    ...bonus,
    profiles: profilesData?.find(p => p.id === bonus.employee_id) || null
  }))

  setBonuses(enriched as any)
}

  const togglePanel = (employeeId: string, panel: 'history' | 'config' | 'pay' | 'bonus') => {
    if (activePanel?.employeeId === employeeId && activePanel?.panel === panel) {
      setActivePanel(null); return
    }
    setActivePanel({ employeeId, panel })
    if (panel === 'config') {
      const emp = employees.find(e => e.id === employeeId)
      if (emp) setConfigForm({
        payment_type: emp.payment_type || 'commission',
        commission_rate: emp.commission_rate || 0,
        fixed_salary: emp.fixed_salary || 0,
        shift_rate: emp.shift_rate || 0,
      })
    }
    if (panel === 'pay') {
      setPayForm({ period_name: '', period_start: '', period_end: '', total_sales: 0, base_amount: 0, bonus_amount: 0, total_amount: 0, payment_method: 'transfer', notes: '' })
    }
  }

  const handleSaveConfig = async (employeeId: string) => {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      payment_type: configForm.payment_type,
      commission_rate: configForm.commission_rate,
      fixed_salary: configForm.fixed_salary,
      shift_rate: configForm.shift_rate,
    }).eq('id', employeeId)
    if (error) { alert('Error: ' + error.message) }
    else { await loadEmployees(); setActivePanel(null); alert('✅ Configuración guardada') }
    setSaving(false)
  }

  const handleRegisterPayment = async (employeeId: string) => {
    if (!payForm.period_name || !payForm.period_start || !payForm.period_end) { alert('Completa el período de pago'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('payroll_payments').insert({
      employee_id: employeeId,
      period_name: payForm.period_name,
      period_start: payForm.period_start,
      period_end: payForm.period_end,
      total_sales: payForm.total_sales,
      base_amount: payForm.base_amount,
      bonus_amount: payForm.bonus_amount,
      total_amount: payForm.total_amount,
      payment_method: payForm.payment_method,
      notes: payForm.notes,
      status: 'paid',
      paid_at: new Date().toISOString(),
      approved_by: user?.id
    })
    if (error) { alert('Error: ' + error.message) }
    else { await loadHistory(employeeId); setActivePanel(null); alert('✅ Pago registrado exitosamente') }
    setSaving(false)
  }

  const handleSaveBonus = async () => {
    if (!bonusForm.employee_id || !bonusForm.description || bonusForm.amount <= 0) { alert('Completa todos los campos'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('employee_bonuses').insert({
      employee_id: bonusForm.employee_id,
      bonus_type: bonusForm.bonus_type,
      description: bonusForm.description,
      amount: bonusForm.amount,
      status: 'paid',
      created_by: user?.id,
      approved_by: user?.id
    })
    if (error) { alert('Error: ' + error.message) }
    else { await loadBonuses(); setShowBonusModal(false); setBonusForm({ employee_id: '', bonus_type: 'performance', description: '', amount: 0 }); alert('✅ Bono registrado') }
    setSaving(false)
  }

  const getPaymentSummary = (emp: Employee) => {
    if (emp.payment_type === 'commission') return `$${Number(emp.commission_rate).toLocaleString()} por venta`
    if (emp.payment_type === 'fixed') return `$${Number(emp.fixed_salary).toLocaleString()} fijo`
    if (emp.payment_type === 'shifts') return `$${Number(emp.shift_rate).toLocaleString()} por turno`
    return 'Sin configurar'
  }

  const getBonusTypeLabel = (type: string) => ({ performance: 'Desempeño', attendance: 'Asistencia', sales_goal: 'Meta de ventas', tip: 'Propina', special: 'Especial' }[type] || type)
  const isActive = (employeeId: string, panel: string) => activePanel?.employeeId === employeeId && activePanel?.panel === panel

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 p-8">

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nómina</h1>
          <p className="text-gray-600 mt-1">Gestiona pagos y bonos del equipo</p>
        </div>
        <button onClick={() => setShowBonusModal(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center gap-2">
          <Gift className="w-5 h-5" /> Agregar Bono
        </button>
      </div>

      {/* Tabla principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        {/* Encabezados */}
        <div className="grid grid-cols-5 gap-4 px-6 py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600">
          {['Empleado', 'Historial de Pago', 'Configuración de Pago', 'Registrar Pago', 'Bono'].map(h => (
            <div key={h} className="text-xs font-bold text-white uppercase tracking-wider text-center">{h}</div>
          ))}
        </div>

        {employees.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="font-medium">No hay empleados activos</p>
            <p className="text-sm mt-1">Agrega trabajadores desde la sección Empleados</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {employees.map(emp => {
              const empHistory = histories[emp.id] || []
              return (
                <div key={emp.id}>
                  {/* Fila */}
                  <div className="grid grid-cols-5 gap-4 px-6 py-5 items-center hover:bg-gray-50 transition-colors">
                    {/* Empleado */}
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center shrink-0 shadow-md">
                        <span className="text-white font-bold">{emp.nombres?.charAt(0)}{emp.apellidos?.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{emp.full_name}</p>
                        <p className="text-xs text-gray-500 capitalize">{emp.role}</p>
                        <p className="text-xs text-purple-600 font-semibold mt-0.5">{getPaymentSummary(emp)}</p>
                      </div>
                    </div>

                    {/* Historial */}
                    <div className="flex justify-center">
                      <button onClick={() => togglePanel(emp.id, 'history')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                          isActive(emp.id, 'history') ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}>
                        <History className="w-4 h-4" />
                        Ver ({empHistory.length})
                        {isActive(emp.id, 'history') ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    {/* Configuración */}
                    <div className="flex justify-center">
                      <button onClick={() => togglePanel(emp.id, 'config')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                          isActive(emp.id, 'config') ? 'bg-purple-600 text-white shadow-lg' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                        }`}>
                        <Settings className="w-4 h-4" />
                        Configurar
                        {isActive(emp.id, 'config') ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    {/* Registrar Pago */}
                    <div className="flex justify-center">
                      <button onClick={() => togglePanel(emp.id, 'pay')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                          isActive(emp.id, 'pay') ? 'bg-green-600 text-white shadow-lg' : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}>
                        <DollarSign className="w-4 h-4" />
                        Pagar
                        {isActive(emp.id, 'pay') ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    {/* Bono */}
                    <div className="flex justify-center">
                      <button onClick={() => { setBonusForm({ ...bonusForm, employee_id: emp.id }); setShowBonusModal(true) }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all">
                        <Gift className="w-4 h-4" /> Bono
                      </button>
                    </div>
                  </div>

                  {/* Panel: Historial */}
                  {isActive(emp.id, 'history') && (
                    <div className="px-6 pb-5 bg-blue-50/40 border-t border-blue-100">
                      <p className="text-sm font-bold text-gray-700 py-3">Historial de Pagos — {emp.full_name}</p>
                      {empHistory.length === 0 ? (
                        <p className="text-sm text-gray-500 py-4 text-center bg-white rounded-xl border border-blue-100">No hay pagos registrados aún</p>
                      ) : (
                        <div className="space-y-2">
                          {empHistory.map(h => (
                            <div key={h.id} className="bg-white rounded-xl p-4 flex items-center justify-between border border-blue-100 hover:border-blue-200 transition-colors">
                              <div>
                                <p className="font-bold text-gray-900">{h.period_name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {format(new Date(h.period_start), "d 'de' MMM", { locale: es })} — {format(new Date(h.period_end), "d 'de' MMM yyyy", { locale: es })}
                                </p>
                                <div className="flex gap-4 mt-1">
                                  <span className="text-xs text-gray-400">Ventas: ${Number(h.total_sales).toLocaleString()}</span>
                                  <span className="text-xs text-gray-400">Base: ${Number(h.base_amount).toLocaleString()}</span>
                                  {Number(h.bonus_amount) > 0 && <span className="text-xs text-green-600">+Bono: ${Number(h.bonus_amount).toLocaleString()}</span>}
                                </div>
                                {h.notes && <p className="text-xs text-gray-400 italic mt-1">{h.notes}</p>}
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-purple-600">${Number(h.total_amount).toLocaleString()}</p>
                                <p className="text-xs text-gray-500 capitalize">{h.payment_method}</p>
                                {h.paid_at && <p className="text-xs text-gray-400">{format(new Date(h.paid_at), "d MMM yyyy", { locale: es })}</p>}
                                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold mt-1">✓ Pagado</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Panel: Configuración */}
                  {isActive(emp.id, 'config') && (
                    <div className="px-6 pb-5 bg-purple-50/40 border-t border-purple-100">
                      <p className="text-sm font-bold text-gray-700 py-3">Configuración de Pago — {emp.full_name}</p>
                      <div className="bg-white rounded-xl p-5 border border-purple-100 space-y-5">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Tipo de Compensación</label>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { value: 'commission', label: 'Comisión por venta', desc: 'Monto fijo por cada venta' },
                              { value: 'fixed', label: 'Salario fijo', desc: 'Monto fijo por período' },
                              { value: 'shifts', label: 'Por turno', desc: 'Monto fijo por turno trabajado' }
                            ].map(opt => (
                              <button key={opt.value} onClick={() => setConfigForm({ ...configForm, payment_type: opt.value })}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${
                                  configForm.payment_type === opt.value
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}>
                                <p className={`font-bold text-sm ${configForm.payment_type === opt.value ? 'text-purple-700' : 'text-gray-700'}`}>{opt.label}</p>
                                <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        {configForm.payment_type === 'commission' && (
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Monto por venta ($)</label>
                            <input type="number" value={configForm.commission_rate}
                              onChange={(e) => setConfigForm({ ...configForm, commission_rate: Number(e.target.value) })}
                              placeholder="Ej: 15000" min="0"
                              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-300 outline-none text-sm font-semibold" />
                            <p className="text-xs text-purple-600 mt-2 font-medium">
                              Recibirá <strong>${Number(configForm.commission_rate).toLocaleString()}</strong> por cada venta/servicio realizado en el período
                            </p>
                          </div>
                        )}
                        {configForm.payment_type === 'fixed' && (
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Salario fijo por período ($)</label>
                            <input type="number" value={configForm.fixed_salary}
                              onChange={(e) => setConfigForm({ ...configForm, fixed_salary: Number(e.target.value) })}
                              placeholder="Ej: 1500000" min="0"
                              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-300 outline-none text-sm font-semibold" />
                          </div>
                        )}
                        {configForm.payment_type === 'shifts' && (
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Valor por turno ($)</label>
                            <input type="number" value={configForm.shift_rate}
                              onChange={(e) => setConfigForm({ ...configForm, shift_rate: Number(e.target.value) })}
                              placeholder="Ej: 50000" min="0"
                              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-purple-300 outline-none text-sm font-semibold" />
                          </div>
                        )}

                        <button onClick={() => handleSaveConfig(emp.id)} disabled={saving}
                          className="w-full py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                          <Save className="w-4 h-4" />
                          {saving ? 'Guardando...' : 'Guardar Configuración'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Panel: Registrar Pago */}
                  {isActive(emp.id, 'pay') && (
                    <div className="px-6 pb-5 bg-green-50/40 border-t border-green-100">
                      <p className="text-sm font-bold text-gray-700 py-3">Registrar Pago — {emp.full_name}</p>
                      <div className="bg-white rounded-xl p-5 border border-green-100 space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombre del período *</label>
                            <input type="text" value={payForm.period_name}
                              onChange={(e) => setPayForm({ ...payForm, period_name: e.target.value })}
                              placeholder="Ej: Quincena Mayo 2026"
                              className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-300 outline-none text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Fecha inicio *</label>
                            <input type="date" value={payForm.period_start}
                              onChange={(e) => setPayForm({ ...payForm, period_start: e.target.value })}
                              className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-300 outline-none text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Fecha fin *</label>
                            <input type="date" value={payForm.period_end}
                              onChange={(e) => setPayForm({ ...payForm, period_end: e.target.value })}
                              className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-300 outline-none text-sm" />
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total ventas del período</label>
                            <input type="number" value={payForm.total_sales}
                              onChange={(e) => setPayForm({ ...payForm, total_sales: Number(e.target.value) })}
                              min="0" className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-300 outline-none text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Monto base *</label>
                            <input type="number" value={payForm.base_amount}
                              onChange={(e) => {
                                const base = Number(e.target.value)
                                setPayForm({ ...payForm, base_amount: base, total_amount: base + payForm.bonus_amount })
                              }}
                              min="0" className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-300 outline-none text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Bonos adicionales</label>
                            <input type="number" value={payForm.bonus_amount}
                              onChange={(e) => {
                                const bonus = Number(e.target.value)
                                setPayForm({ ...payForm, bonus_amount: bonus, total_amount: payForm.base_amount + bonus })
                              }}
                              min="0" className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-300 outline-none text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">TOTAL A PAGAR</label>
                            <div className="w-full px-3 py-2.5 bg-green-100 border-2 border-green-400 rounded-xl text-base font-bold text-green-700">
                              ${Number(payForm.total_amount).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Método de pago</label>
                            <select value={payForm.payment_method}
                              onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                              className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-300 outline-none text-sm">
                              <option value="transfer">Transferencia</option>
                              <option value="cash">Efectivo</option>
                              <option value="check">Cheque</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Notas</label>
                            <input type="text" value={payForm.notes}
                              onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                              placeholder="Observaciones opcionales..."
                              className="w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-300 outline-none text-sm" />
                          </div>
                        </div>

                        <button onClick={() => handleRegisterPayment(emp.id)}
                          disabled={saving || !payForm.period_name || !payForm.period_start || !payForm.period_end || payForm.total_amount <= 0}
                          className="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-base">
                          <CheckCircle2 className="w-5 h-5" />
                          {saving ? 'Registrando...' : `Confirmar Pago de $${Number(payForm.total_amount).toLocaleString()}`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sección Bonos */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50"
          onClick={() => setShowAllBonuses(!showAllBonuses)}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Gift className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Bonos Registrados</h2>
              <p className="text-xs text-gray-500">{bonuses.length} bono{bonuses.length !== 1 ? 's' : ''} en total</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={(e) => { e.stopPropagation(); setShowBonusModal(true) }}
              className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl font-semibold text-sm transition-all flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nuevo Bono
            </button>
            {showAllBonuses ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          </div>
        </div>

        {showAllBonuses && (
          <div className="p-6">
            {bonuses.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay bonos registrados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-amber-50">
                    <tr>
                      {['Empleado', 'Tipo', 'Descripción', 'Monto', 'Fecha'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-amber-800 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bonuses.map(bonus => (
                      <tr key={bonus.id} className="hover:bg-amber-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-900 text-sm">{(bonus.profiles as any)?.full_name || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold">{getBonusTypeLabel(bonus.bonus_type)}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{bonus.description}</td>
                        <td className="px-4 py-3 font-bold text-green-600">+${Number(bonus.amount).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{format(new Date(bonus.created_at), 'd MMM yyyy', { locale: es })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Bono */}
      {showBonusModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">Agregar Bono</h2>
              <button onClick={() => setShowBonusModal(false)}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors">
                <X className="w-5 h-5 text-white" strokeWidth={2} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Empleado *</label>
                <select value={bonusForm.employee_id} onChange={(e) => setBonusForm({ ...bonusForm, employee_id: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-amber-300 outline-none text-sm">
                  <option value="">Seleccionar empleado...</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Bono *</label>
                <select value={bonusForm.bonus_type} onChange={(e) => setBonusForm({ ...bonusForm, bonus_type: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-amber-300 outline-none text-sm">
                  <option value="performance">Desempeño</option>
                  <option value="attendance">Asistencia</option>
                  <option value="sales_goal">Meta de ventas</option>
                  <option value="tip">Propina</option>
                  <option value="special">Especial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción *</label>
                <input type="text" value={bonusForm.description} onChange={(e) => setBonusForm({ ...bonusForm, description: e.target.value })}
                  placeholder="Ej: Bono por meta de mayo"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-amber-300 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Monto ($) *</label>
                <input type="number" value={bonusForm.amount || ''} onChange={(e) => setBonusForm({ ...bonusForm, amount: Number(e.target.value) })}
                  placeholder="Ej: 50000" min="0"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-amber-300 outline-none text-sm font-semibold" />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex gap-3">
              <button onClick={() => setShowBonusModal(false)}
                className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSaveBonus} disabled={saving}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                <Gift className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Registrar Bono'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}