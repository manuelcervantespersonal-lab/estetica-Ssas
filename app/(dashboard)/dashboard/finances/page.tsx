'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Select } from '@/app/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Plus, DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react'

interface Payment {
  id: string
  appointment_id: string
  amount: number
  payment_method: string
  payment_date: string
  created_at: string
  appointments?: {
    clients: { full_name: string }
    services: { name: string }
  }
}

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  expense_date: string
  created_at: string
}

export default function FinancesPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month')
  
  const [expenseFormData, setExpenseFormData] = useState({
  description: '',
  amount: 0,
  category: 'inventory',
  expense_date: new Date().toISOString().split('T')[0],
})

  const supabase = createClient()

  useEffect(() => {
    loadFinances()
  }, [selectedPeriod])

  const loadFinances = async () => {
    const dateFilter = getDateFilter()

    // Cargar pagos
    const { data: paymentsData } = await supabase
      .from('payments')
      .select(`
        *,
        appointments(
          clients(full_name),
          services(name)
        )
      `)
      .gte('payment_date', dateFilter)
      .order('payment_date', { ascending: false })

    if (paymentsData) setPayments(paymentsData as any)

    // Cargar gastos
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', dateFilter)
      .order('expense_date', { ascending: false })

    if (expensesData) setExpenses(expensesData)
  }

  const getDateFilter = () => {
    const now = new Date()
    switch (selectedPeriod) {
      case 'today':
        return now.toISOString().split('T')[0]
      case 'week':
        const weekAgo = new Date(now)
        weekAgo.setDate(now.getDate() - 7)
        return weekAgo.toISOString().split('T')[0]
      case 'month':
        const monthAgo = new Date(now)
        monthAgo.setMonth(now.getMonth() - 1)
        return monthAgo.toISOString().split('T')[0]
      case 'year':
        const yearAgo = new Date(now)
        yearAgo.setFullYear(now.getFullYear() - 1)
        return yearAgo.toISOString().split('T')[0]
      default:
        return now.toISOString().split('T')[0]
    }
  }

  const handleCreateExpense = async () => {
    if (!expenseFormData.description || expenseFormData.amount <= 0) {
      alert('Por favor completa todos los campos')
      return
    }

    const { error } = await supabase
      .from('expenses')
      .insert(expenseFormData)

    if (error) {
        console.error('Error al crear gasto:', error)
        console.error('Detalles:', JSON.stringify(error, null, 2))
        alert(`Error: ${error.message}`)
        return
        }

    setShowExpenseModal(false)
    setExpenseFormData({
      description: '',
      amount: 0,
      category: 'supplies',
      expense_date: new Date().toISOString().split('T')[0],
    })
    loadFinances()
  }

  const handleDeleteExpense = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este gasto?')) {
      await supabase.from('expenses').delete().eq('id', id)
      loadFinances()
    }
  }

  const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const netProfit = totalIncome - totalExpenses

  const expenseCategories = [
  { value: 'inventory', label: 'Inventario / Productos' },
  { value: 'services', label: 'Servicios (Luz, Agua, Internet)' },
  { value: 'rent', label: 'Alquiler' },
  { value: 'salaries', label: 'Salarios' },
  { value: 'marketing', label: 'Publicidad y Marketing' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'equipment', label: 'Equipamiento' },
  { value: 'other', label: 'Otros' },
]

  const paymentMethods = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'card', label: 'Tarjeta' },
    { value: 'transfer', label: 'Transferencia' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Finanzas</h1>
          <p className="text-gray-600">Control de ingresos y gastos</p>
        </div>
        <div className="flex gap-3">
          <Select
            label=""
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            options={[
              { value: 'today', label: 'Hoy' },
              { value: 'week', label: 'Última semana' },
              { value: 'month', label: 'Último mes' },
              { value: 'year', label: 'Último año' },
            ]}
          />
          <Button onClick={() => setShowExpenseModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Registrar Gasto
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Ingresos
              </CardTitle>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              ${totalIncome.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">{payments.length} transacciones</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Gastos
              </CardTitle>
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              ${totalExpenses.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">{expenses.length} gastos</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${netProfit >= 0 ? 'border-l-primary' : 'border-l-orange-500'}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Balance Neto
              </CardTitle>
              <div className={`w-10 h-10 ${netProfit >= 0 ? 'bg-primary/10' : 'bg-orange-100'} rounded-full flex items-center justify-center`}>
                <DollarSign className={`w-5 h-5 ${netProfit >= 0 ? 'text-primary' : 'text-orange-600'}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-primary' : 'text-orange-600'}`}>
              ${netProfit.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {netProfit >= 0 ? 'Ganancia' : 'Pérdida'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid de 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ingresos */}
        <Card>
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Ingresos Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {payments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No hay ingresos en este período
              </div>
            ) : (
              <div className="space-y-3">
                {payments.slice(0, 10).map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {payment.appointments?.clients?.full_name || 'Cliente eliminado'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {payment.appointments?.services?.name || 'Servicio'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(payment.payment_date).toLocaleDateString('es-ES')} · {' '}
                        {paymentMethods.find(m => m.value === payment.payment_method)?.label}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        ${payment.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gastos */}
        <Card>
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              Gastos Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {expenses.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No hay gastos registrados
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.slice(0, 10).map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {expense.description}
                      </p>
                      <p className="text-sm text-gray-600">
                        {expenseCategories.find(c => c.value === expense.category)?.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(expense.expense_date).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-red-600">
                        ${expense.amount.toLocaleString()}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteExpense(expense.id)}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Registrar Gasto */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-3xl font-bold mb-6">Registrar Gasto</h2>

            <div className="space-y-4">
              <Input
                label="Descripción *"
                value={expenseFormData.description}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                placeholder="Compra de productos"
              />

              <Input
                label="Monto *"
                type="number"
                value={expenseFormData.amount}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: Number(e.target.value) })}
                min={0}
              />

              <Select
                label="Categoría"
                value={expenseFormData.category}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value })}
                options={expenseCategories}
              />

              <Input
                label="Fecha"
                type="date"
                value={expenseFormData.expense_date}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, expense_date: e.target.value })}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={handleCreateExpense} className="flex-1">
                Registrar
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowExpenseModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}