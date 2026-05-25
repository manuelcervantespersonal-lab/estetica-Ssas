'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { FileDown } from 'lucide-react'

interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  appointment_id: string
  created_at: string
}

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  expense_date: string
  created_at: string
}

interface MonthlyData {
  month: string
  ingresos: number
  gastos: number
  balance: number
}

export default function FinancesPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    loadFinances()
    loadChartData()
  }, [selectedMonth])

  const loadFinances = async () => {
    const monthStart = startOfMonth(selectedMonth).toISOString().split('T')[0]
    const monthEnd = endOfMonth(selectedMonth).toISOString().split('T')[0]

    const { data: paymentsData } = await supabase
      .from('payments')
      .select('*')
      .gte('payment_date', monthStart)
      .lte('payment_date', monthEnd)
      .order('payment_date', { ascending: false })

    const { data: expensesData } = await supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', monthStart)
      .lte('expense_date', monthEnd)
      .order('expense_date', { ascending: false })

    if (paymentsData) setPayments(paymentsData)
    if (expensesData) setExpenses(expensesData)
  }

  const loadChartData = async () => {
    // Datos de los últimos 6 meses
    const months: MonthlyData[] = []
    
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i)
      const monthStart = startOfMonth(date).toISOString().split('T')[0]
      const monthEnd = endOfMonth(date).toISOString().split('T')[0]

      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount')
        .gte('payment_date', monthStart)
        .lte('payment_date', monthEnd)

      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount')
        .gte('expense_date', monthStart)
        .lte('expense_date', monthEnd)

      const ingresos = paymentsData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
      const gastos = expensesData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0

      months.push({
        month: format(date, 'MMM', { locale: es }),
        ingresos,
        gastos,
        balance: ingresos - gastos
      })
    }
    const generatePDF = () => {
  const doc = new jsPDF()
  
  // Configuración
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  // Header
  doc.setFillColor(139, 92, 246) // Color primary
  doc.rect(0, 0, pageWidth, 40, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.text('Estética Pro', 20, 20)
  
  doc.setFontSize(14)
  doc.text('Reporte Financiero', 20, 30)
  
  // Fecha del reporte
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Generado: ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`, 20, 50)
  doc.text(`Período: ${format(selectedMonth, "MMMM yyyy", { locale: es })}`, 20, 56)
  
  // Resumen
  doc.setFontSize(16)
  doc.setTextColor(0, 0, 0)
  doc.text('Resumen del Mes', 20, 70)
  
  // Tabla de resumen
  autoTable(doc, {
    startY: 75,
    head: [['Concepto', 'Monto']],
    body: [
      ['Ingresos', `$${totalIngresos.toLocaleString()}`],
      ['Gastos', `$${totalGastos.toLocaleString()}`],
      ['Balance', `$${balance.toLocaleString()}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [139, 92, 246] },
    styles: { fontSize: 12 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 80, halign: 'right', fontStyle: 'bold' }
    }
  })
  
  // Gastos detallados
  if (expenses.length > 0) {
    doc.setFontSize(16)
    doc.text('Gastos del Mes', 20, (doc as any).lastAutoTable.finalY + 15)
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Fecha', 'Descripción', 'Categoría', 'Monto']],
      body: expenses.map(expense => [
        format(new Date(expense.expense_date), 'dd/MM/yyyy'),
        expense.description,
        expense.category,
        `$${Number(expense.amount).toLocaleString()}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 70 },
        2: { cellWidth: 40 },
        3: { cellWidth: 40, halign: 'right' }
      }
    })
  }
  
  // Totales por categoría
  if (categoryData.length > 0) {
    const yPos = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : 200
    
    // Nueva página si no hay espacio
    if (yPos > pageHeight - 80) {
      doc.addPage()
      doc.setFontSize(16)
      doc.text('Gastos por Categoría', 20, 20)
      
      autoTable(doc, {
        startY: 25,
        head: [['Categoría', 'Monto', '%']],
        body: categoryData.map(cat => {
          const percentage = ((cat.value / totalGastos) * 100).toFixed(1)
          return [
            cat.name,
            `$${cat.value.toLocaleString()}`,
            `${percentage}%`
          ]
        }),
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246] },
        styles: { fontSize: 10 }
      })
    } else {
      doc.setFontSize(16)
      doc.text('Gastos por Categoría', 20, yPos)
      
      autoTable(doc, {
        startY: yPos + 5,
        head: [['Categoría', 'Monto', '%']],
        body: categoryData.map(cat => {
          const percentage = ((cat.value / totalGastos) * 100).toFixed(1)
          return [
            cat.name,
            `$${cat.value.toLocaleString()}`,
            `${percentage}%`
          ]
        }),
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246] },
        styles: { fontSize: 10 }
      })
    }
  }
  
  // Footer en todas las páginas
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }
  
  // Guardar PDF
  const fileName = `reporte-finanzas-${format(selectedMonth, 'yyyy-MM')}.pdf`
  doc.save(fileName)
}
    setMonthlyData(months)

    // Datos por categoría de gastos
    const { data: allExpenses } = await supabase
      .from('expenses')
      .select('category, amount')
      .gte('expense_date', startOfMonth(subMonths(new Date(), 5)).toISOString().split('T')[0])

    const categories: { [key: string]: number } = {}
    allExpenses?.forEach(expense => {
      categories[expense.category] = (categories[expense.category] || 0) + Number(expense.amount)
    })

    const categoryArray = Object.entries(categories).map(([name, value]) => ({
      name,
      value
    }))

    setCategoryData(categoryArray)
  }

  const totalIngresos = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalGastos = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const balance = totalIngresos - totalGastos

  // Mes anterior
  const previousMonth = subMonths(selectedMonth, 1)
  const previousMonthData = monthlyData.find(m => m.month === format(previousMonth, 'MMM', { locale: es }))
  const balanceChange = previousMonthData ? balance - previousMonthData.balance : 0
  const balancePercentage = previousMonthData?.balance ? ((balanceChange / previousMonthData.balance) * 100).toFixed(1) : '0'

  const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#6366f1']

  const handleSavePayment = async (data: any) => {
    await supabase.from('payments').insert(data)
    setShowPaymentModal(false)
    loadFinances()
    loadChartData()
  }

  const handleSaveExpense = async (data: any) => {
    await supabase.from('expenses').insert(data)
    setShowExpenseModal(false)
    loadFinances()
    loadChartData()
  }

  const handleDeleteExpense = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este gasto?')) {
      await supabase.from('expenses').delete().eq('id', id)
      loadFinances()
      loadChartData()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Finanzas</h1>
          <p className="text-gray-600">Control de ingresos y gastos</p>
        </div>
        <div className="flex gap-3">
          <Input
            type="month"
            value={format(selectedMonth, 'yyyy-MM')}
            onChange={(e) => setSelectedMonth(new Date(e.target.value + '-01'))}
            className="w-40"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Ingresos del Mes
              </CardTitle>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              ${totalIngresos.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {payments.length} pagos registrados
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Gastos del Mes
              </CardTitle>
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              ${totalGastos.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {expenses.length} gastos registrados
            </p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${balance >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Balance
              </CardTitle>
              <DollarSign className={`w-5 h-5 ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              ${balance.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {balanceChange >= 0 ? '+' : ''}{balancePercentage}% vs mes anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfica de Ingresos vs Gastos */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos vs Gastos (Últimos 6 Meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" />
                <Bar dataKey="gastos" fill="#ef4444" name="Gastos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfica de Categorías de Gastos */}
        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No hay datos de gastos
              </div>
            )}
          </CardContent>
        </Card>
      </div>

     {/* Botones de acción */}
<div className="flex gap-3">
  <Button onClick={() => setShowExpenseModal(true)}>
    <Plus className="w-4 h-4 mr-2" />
    Registrar Gasto
  </Button>
  
  {/* AGREGAR ESTE BOTÓN */}
  <Button 
    onClick={generatePDF} 
    variant="outline"
    className="border-primary text-primary hover:bg-primary hover:text-white"
  >
    <FileDown className="w-4 h-4 mr-2" />
    Exportar PDF
  </Button>
</div>

      {/* Lista de Gastos */}
      <Card>
        <CardHeader>
          <CardTitle>Gastos del Mes</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay gastos registrados</p>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{expense.description}</p>
                    <p className="text-sm text-gray-600">
                      {expense.category} • {format(new Date(expense.expense_date), 'd MMM yyyy', { locale: es })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-bold text-red-600">
                      -${Number(expense.amount).toLocaleString()}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteExpense(expense.id)}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para Gastos */}
      {showExpenseModal && (
        <ExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onSave={handleSaveExpense}
        />
      )}
    </div>
  )
}

// Componente Modal para Gastos
function ExpenseModal({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => void }) {
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    category: 'operaciones',
    expense_date: new Date().toISOString().split('T')[0]
  })

  const categories = [
    { value: 'operaciones', label: 'Operaciones' },
    { value: 'inventario', label: 'Inventario/Productos' },
    { value: 'servicios', label: 'Servicios' },
    { value: 'nomina', label: 'Nómina' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'mantenimiento', label: 'Mantenimiento' },
    { value: 'otro', label: 'Otro' },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.description || formData.amount <= 0) {
      alert('Por favor completa todos los campos')
      return
    }
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6">Registrar Gasto</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Descripción"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Ej: Compra de productos"
            required
          />
          
          <Input
            label="Monto"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
            min={0}
            step="0.01"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <Input
            label="Fecha"
            type="date"
            value={formData.expense_date}
            onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
            required
          />

          <div className="flex gap-3 mt-6">
            <Button type="submit" className="flex-1">Guardar</Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}