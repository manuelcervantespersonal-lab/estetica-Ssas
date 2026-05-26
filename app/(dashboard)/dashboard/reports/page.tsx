'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Users, 
  Calendar,
  Download,
  Filter,
  FileText,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles
} from 'lucide-react'
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  PieChart, 
  Pie, 
  Cell, 
  LineChart,
  Line,
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend 
} from 'recharts'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
// xlsx se importa dinámicamente en la función, no necesita import estático

interface ReportStats {
  totalRevenue: number
  totalExpenses: number
  totalProfit: number
  appointmentsCount: number
  completedAppointments: number
  newClients: number
  servicesData: any[]
  revenueData: any[]
  employeeData: any[]
  recentActivity: any[]
}

export default function ReportsPage() {
  const [stats, setStats] = useState<ReportStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    totalProfit: 0,
    appointmentsCount: 0,
    completedAppointments: 0,
    newClients: 0,
    servicesData: [],
    revenueData: [],
    employeeData: [],
    recentActivity: []
  })
  
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  })
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month')

  const supabase = createClient()

  useEffect(() => {
    loadReportData()
  }, [dateRange])

  const loadReportData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        window.location.href = '/login'
        return
      }

      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserRole(profile.role)
      }

      // Cargar datos según el rol
      await Promise.all([
        loadFinancialMetrics(profile?.role, user.id),
        loadAppointmentMetrics(profile?.role, user.id),
        loadServiceMetrics(profile?.role),
        loadRevenueData(profile?.role, user.id),
        loadEmployeePerformance(profile?.role, user.id),
        loadRecentActivity(profile?.role, user.id)
      ])

      setLoading(false)
    } catch (error) {
      console.error('Error cargando reportes:', error)
      setLoading(false)
    }
  }

  const loadFinancialMetrics = async (role: string, currentUserId: string) => {
    try {
      // Para admin y cajero: métricas totales
      if (role === 'admin' || role === 'cajero') {
        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .gte('payment_date', dateRange.from)
          .lte('payment_date', dateRange.to)

        const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

        // Simular gastos (deberías tener una tabla de expenses)
        const totalExpenses = totalRevenue * 0.35 // 35% de gastos operativos

        setStats(prev => ({
          ...prev,
          totalRevenue,
          totalExpenses,
          totalProfit: totalRevenue - totalExpenses
        }))
      } 
      // Para estilista: solo sus ingresos
      else if (role === 'estilista') {
        const { data: appointments } = await supabase
          .from('appointments')
          .select(`
            services(price)
          `)
          .eq('employee_id', currentUserId)
          .eq('status', 'completed')
          .gte('appointment_date', dateRange.from)
          .lte('appointment_date', dateRange.to)

        const revenue = appointments?.reduce((sum, apt) => sum + (apt.services?.price || 0), 0) || 0

        setStats(prev => ({
          ...prev,
          totalRevenue: revenue,
          totalProfit: revenue * 0.4 // Comisión del 40%
        }))
      }
    } catch (error) {
      console.error('Error cargando métricas financieras:', error)
    }
  }

  const loadAppointmentMetrics = async (role: string, currentUserId: string) => {
    try {
      let query = supabase
        .from('appointments')
        .select('id, status, appointment_date')
        .gte('appointment_date', dateRange.from)
        .lte('appointment_date', dateRange.to)

      if (role === 'estilista') {
        query = query.eq('employee_id', currentUserId)
      }

      const { data } = await query

      setStats(prev => ({
        ...prev,
        appointmentsCount: data?.length || 0,
        completedAppointments: data?.filter(a => a.status === 'completed').length || 0
      }))
    } catch (error) {
      console.error('Error cargando métricas de citas:', error)
    }
  }

  const loadServiceMetrics = async (role: string) => {
    if (role === 'estilista') return // Los estilistas no ven este reporte

    try {
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          services(id, name, price)
        `)
        .eq('status', 'completed')
        .gte('appointment_date', dateRange.from)
        .lte('appointment_date', dateRange.to)

      // Agrupar por servicio
      const serviceMap = new Map()
      
      appointments?.forEach(apt => {
        const service = apt.services
        if (service) {
          const existing = serviceMap.get(service.id) || { name: service.name, value: 0, revenue: 0 }
          existing.value += 1
          existing.revenue += service.price
          serviceMap.set(service.id, existing)
        }
      })

      const servicesData = Array.from(serviceMap.values())
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map((item, index) => ({
          ...item,
          color: ['#a855f7', '#ec4899', '#8b5cf6', '#d946ef', '#c084fc'][index]
        }))

      setStats(prev => ({ ...prev, servicesData }))
    } catch (error) {
      console.error('Error cargando métricas de servicios:', error)
    }
  }

  const loadRevenueData = async (role: string, currentUserId: string) => {
    try {
      const days = []
      const dayCount = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 365

      for (let i = dayCount - 1; i >= 0; i--) {
        days.push(format(subDays(new Date(), i), 'yyyy-MM-dd'))
      }

      const revenueByDay = await Promise.all(
        days.map(async (day) => {
          let query = supabase
            .from('payments')
            .select('amount')
            .eq('payment_date', day)

          if (role === 'estilista') {
            // Solo pagos de citas del estilista
            const { data: stylistPayments } = await supabase
              .from('payments')
              .select('amount')
              .eq('payment_date', day)
              .in('appointment_id', 
                supabase
                  .from('appointments')
                  .select('id')
                  .eq('employee_id', currentUserId)
              )
            
            return {
              date: format(new Date(day), 'dd MMM', { locale: es }),
              ingresos: stylistPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
            }
          }

          const { data } = await query

          return {
            date: format(new Date(day), 'dd MMM', { locale: es }),
            ingresos: data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
            gastos: (data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0) * 0.35
          }
        })
      )

      setStats(prev => ({ ...prev, revenueData: revenueByDay }))
    } catch (error) {
      console.error('Error cargando datos de ingresos:', error)
    }
  }

  const loadEmployeePerformance = async (role: string, currentUserId: string) => {
    if (role === 'estilista') return // Los estilistas no ven este reporte

    try {
      const { data: employees } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'estilista')
        .eq('available', true)

      const employeePerformance = await Promise.all(
        employees?.map(async (emp) => {
          const { data: appointments } = await supabase
            .from('appointments')
            .select(`
              id,
              services(price)
            `)
            .eq('employee_id', emp.id)
            .eq('status', 'completed')
            .gte('appointment_date', dateRange.from)
            .lte('appointment_date', dateRange.to)

          return {
            name: emp.full_name,
            citas: appointments?.length || 0,
            ingresos: appointments?.reduce((sum, apt) => sum + (apt.services?.price || 0), 0) || 0
          }
        }) || []
      )

      setStats(prev => ({ 
        ...prev, 
        employeeData: employeePerformance.sort((a, b) => b.ingresos - a.ingresos)
      }))
    } catch (error) {
      console.error('Error cargando rendimiento de empleados:', error)
    }
  }

  const loadRecentActivity = async (role: string, currentUserId: string) => {
    try {
      let query = supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          payment_method,
          appointments(
            clients(full_name),
            services(name)
          )
        `)
        .order('payment_date', { ascending: false })
        .limit(10)

      if (role === 'estilista') {
        // Solo pagos de sus citas
        query = query.in('appointment_id',
          supabase
            .from('appointments')
            .select('id')
            .eq('employee_id', currentUserId)
        )
      }

      const { data } = await query

      setStats(prev => ({ ...prev, recentActivity: data || [] }))
    } catch (error) {
      console.error('Error cargando actividad reciente:', error)
    }
  }

  const loadNewClients = async () => {
    try {
      const { count } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dateRange.from)
        .lte('created_at', dateRange.to)

      setStats(prev => ({ ...prev, newClients: count || 0 }))
    } catch (error) {
      console.error('Error cargando nuevos clientes:', error)
    }
  }

  const handleExportPDF = () => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Header
  doc.setFillColor(139, 92, 246)
  doc.rect(0, 0, pageWidth, 40, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.text('Estética Pro', 20, 20)
  doc.setFontSize(13)
  doc.text('Reporte de Análisis', 20, 30)

  doc.setTextColor(100, 100, 100)
  doc.setFontSize(10)
  doc.text(`Generado: ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`, 20, 50)
  doc.text(`Período: ${dateRange.from} al ${dateRange.to}`, 20, 56)

  // Resumen financiero
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(15)
  doc.text('Resumen Financiero', 20, 70)

  const summaryRows = [
    ['Ingresos Totales', `$${stats.totalRevenue.toLocaleString()}`],
    ...(userRole !== 'estilista' ? [
      ['Gastos', `$${stats.totalExpenses.toLocaleString()}`],
    ] : []),
    [userRole === 'estilista' ? 'Mis Comisiones' : 'Ganancias Netas', `$${stats.totalProfit.toLocaleString()}`],
    ['Citas Completadas', `${stats.completedAppointments} de ${stats.appointmentsCount}`],
  ]

  autoTable(doc, {
    startY: 75,
    head: [['Concepto', 'Valor']],
    body: summaryRows,
    theme: 'grid',
    headStyles: { fillColor: [139, 92, 246] },
    styles: { fontSize: 11 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 70, halign: 'right', fontStyle: 'bold' }
    }
  })

  // Servicios más vendidos (solo admin/cajero)
  if ((userRole === 'admin' || userRole === 'cajero') && stats.servicesData.length > 0) {
    doc.setFontSize(15)
    doc.setTextColor(0, 0, 0)
    doc.text('Servicios Más Vendidos', 20, doc.lastAutoTable.finalY + 15)

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Servicio', 'Citas', 'Ingresos']],
      body: stats.servicesData.map(s => [
        s.name,
        s.value,
        `$${s.revenue.toLocaleString()}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
      styles: { fontSize: 10 },
      columnStyles: { 2: { halign: 'right' } }
    })
  }

  // Rendimiento por estilista (solo admin)
  if (userRole === 'admin' && stats.employeeData.length > 0) {
    const yPos = doc.lastAutoTable?.finalY + 15 || 200
    if (yPos > pageHeight - 80) doc.addPage()

    doc.setFontSize(15)
    doc.setTextColor(0, 0, 0)
    doc.text('Rendimiento por Estilista', 20, doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 20)

    autoTable(doc, {
      startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 25,
      head: [['Estilista', 'Citas', 'Ingresos']],
      body: stats.employeeData.map(e => [
        e.name,
        e.citas,
        `$${e.ingresos.toLocaleString()}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
      styles: { fontSize: 10 },
      columnStyles: { 2: { halign: 'right' } }
    })
  }

  // Actividad reciente
  if (stats.recentActivity.length > 0) {
    const yPos = doc.lastAutoTable?.finalY + 15 || 200
    if (yPos > pageHeight - 80) doc.addPage()

    doc.setFontSize(15)
    doc.setTextColor(0, 0, 0)
    doc.text('Actividad Reciente', 20, doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 20)

    autoTable(doc, {
      startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 25,
      head: [['Fecha', 'Cliente', 'Servicio', 'Método', 'Monto']],
      body: stats.recentActivity.map((a: any) => [
        format(new Date(a.payment_date), 'dd/MM/yyyy'),
        a.appointments?.clients?.full_name || '-',
        a.appointments?.services?.name || '-',
        a.payment_method,
        `$${Number(a.amount).toLocaleString()}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
      styles: { fontSize: 9 },
      columnStyles: { 4: { halign: 'right' } }
    })
  }

  // Paginación
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
  }

  doc.save(`reporte-${dateRange.from}-${dateRange.to}.pdf`)
}

const handleExportExcel = () => {
  import('xlsx').then((XLSX) => {
    const wb = XLSX.utils.book_new()

    // Hoja 1: Resumen
    const summaryData = [
      ['Reporte Estética Pro'],
      [`Período: ${dateRange.from} al ${dateRange.to}`],
      [],
      ['Concepto', 'Valor'],
      ['Ingresos Totales', stats.totalRevenue],
      ...(userRole !== 'estilista' ? [['Gastos', stats.totalExpenses]] : []),
      [userRole === 'estilista' ? 'Mis Comisiones' : 'Ganancias Netas', stats.totalProfit],
      ['Citas Completadas', stats.completedAppointments],
      ['Total Citas', stats.appointmentsCount],
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen')

    // Hoja 2: Servicios (admin/cajero)
    if ((userRole === 'admin' || userRole === 'cajero') && stats.servicesData.length > 0) {
      const servicesData = [
        ['Servicio', 'Citas', 'Ingresos'],
        ...stats.servicesData.map(s => [s.name, s.value, s.revenue])
      ]
      const ws2 = XLSX.utils.aoa_to_sheet(servicesData)
      XLSX.utils.book_append_sheet(wb, ws2, 'Servicios')
    }

    // Hoja 3: Estilistas (admin)
    if (userRole === 'admin' && stats.employeeData.length > 0) {
      const employeeData = [
        ['Estilista', 'Citas', 'Ingresos'],
        ...stats.employeeData.map(e => [e.name, e.citas, e.ingresos])
      ]
      const ws3 = XLSX.utils.aoa_to_sheet(employeeData)
      XLSX.utils.book_append_sheet(wb, ws3, 'Estilistas')
    }

    // Hoja 4: Actividad reciente
    if (stats.recentActivity.length > 0) {
      const activityData = [
        ['Fecha', 'Cliente', 'Servicio', 'Método de Pago', 'Monto'],
        ...stats.recentActivity.map((a: any) => [
          format(new Date(a.payment_date), 'dd/MM/yyyy'),
          a.appointments?.clients?.full_name || '-',
          a.appointments?.services?.name || '-',
          a.payment_method,
          Number(a.amount)
        ])
      ]
      const ws4 = XLSX.utils.aoa_to_sheet(activityData)
      XLSX.utils.book_append_sheet(wb, ws4, 'Actividad')
    }

    XLSX.writeFile(wb, `reporte-${dateRange.from}-${dateRange.to}.xlsx`)
  })
}

  const changePeriod = (period: 'week' | 'month' | 'year') => {
    setSelectedPeriod(period)
    const now = new Date()
    
    if (period === 'week') {
      setDateRange({
        from: format(subDays(now, 7), 'yyyy-MM-dd'),
        to: format(now, 'yyyy-MM-dd')
      })
    } else if (period === 'month') {
      setDateRange({
        from: format(startOfMonth(now), 'yyyy-MM-dd'),
        to: format(endOfMonth(now), 'yyyy-MM-dd')
      })
    } else {
      setDateRange({
        from: format(subDays(now, 365), 'yyyy-MM-dd'),
        to: format(now, 'yyyy-MM-dd')
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-purple-50/30">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando reportes...</p>
        </div>
      </div>
    )
  }

  const profitPercentage = stats.totalRevenue > 0 
    ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1)
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 p-8">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {userRole === 'estilista' ? 'Mis Reportes' : 'Reportes y Análisis'}
          </h1>
          <p className="text-gray-600 mt-1">
            {userRole === 'estilista' 
              ? 'Visualiza tu rendimiento y estadísticas personales'
              : 'Análisis completo del rendimiento de tu negocio'}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleExportPDF}
            className="px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <Download className="w-5 h-5" strokeWidth={2} />
            PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="px-5 py-2.5 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <FileText className="w-5 h-5" strokeWidth={2} />
            Excel
          </button>
        </div>
      </div>

      {/* Filtros de período */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => changePeriod('week')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                selectedPeriod === 'week'
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Última semana
            </button>
            <button
              onClick={() => changePeriod('month')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                selectedPeriod === 'month'
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Este mes
            </button>
            <button
              onClick={() => changePeriod('year')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                selectedPeriod === 'year'
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Último año
            </button>
          </div>

          <div className="flex gap-3">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
            />
            <span className="text-gray-500 flex items-center">a</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Ingresos Totales */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
          <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-green-200 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                <DollarSign className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                <TrendingUp className="w-4 h-4" />
                <span>+12%</span>
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Ingresos Totales</p>
            <p className="text-3xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        {/* Gastos (solo admin y cajero) */}
        {(userRole === 'admin' || userRole === 'cajero') && (
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-red-200 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30">
                  <TrendingDown className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-1 text-red-600 text-sm font-semibold">
                  <ArrowDownRight className="w-4 h-4" />
                  <span>-5%</span>
                </div>
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Gastos</p>
              <p className="text-3xl font-bold text-gray-900">${stats.totalExpenses.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Ganancias */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
          <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-purple-200 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Sparkles className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex items-center gap-1 text-purple-600 text-sm font-semibold">
                <span>{profitPercentage}%</span>
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">
              {userRole === 'estilista' ? 'Mis Comisiones' : 'Ganancias Netas'}
            </p>
            <p className="text-3xl font-bold text-gray-900">${stats.totalProfit.toLocaleString()}</p>
          </div>
        </div>

        {/* Citas Completadas */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
          <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Calendar className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex items-center gap-1 text-blue-600 text-sm font-semibold">
                <ArrowUpRight className="w-4 h-4" />
                <span>+8%</span>
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Citas Completadas</p>
            <p className="text-3xl font-bold text-gray-900">{stats.completedAppointments}</p>
            <p className="text-xs text-gray-500 mt-1">de {stats.appointmentsCount} totales</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {userRole === 'estilista' ? 'Mis Ingresos' : 'Ingresos vs Gastos'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">Últimos {selectedPeriod === 'week' ? '7 días' : selectedPeriod === 'month' ? '30 días' : '365 días'}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stats.revenueData}>
              <defs>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                {userRole !== 'estilista' && (
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Area type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
              {userRole !== 'estilista' && (
                <Area type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorGastos)" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Services Pie Chart (solo admin y cajero) */}
        {(userRole === 'admin' || userRole === 'cajero') && stats.servicesData.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Servicios Más Vendidos</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats.servicesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.servicesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-6 space-y-3">
              {stats.servicesData.map((service, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: service.color }}></div>
                    <span className="text-sm text-gray-700">{service.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{service.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Employee Performance (solo admin) */}
      {userRole === 'admin' && stats.employeeData.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Rendimiento por Estilista</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.employeeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Legend />
              <Bar dataKey="citas" fill="#8b5cf6" name="Citas" radius={[8, 8, 0, 0]} />
              <Bar dataKey="ingresos" fill="#ec4899" name="Ingresos" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Actividad Reciente</h3>
        {stats.recentActivity.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No hay actividad reciente</p>
        ) : (
          <div className="space-y-4">
            {stats.recentActivity.map((activity: any) => (
              <div key={activity.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-md">
                  <DollarSign className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    Pago recibido - {activity.appointments?.services?.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {activity.appointments?.clients?.full_name} • {activity.payment_method}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">+${activity.amount}</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(activity.payment_date), 'dd MMM', { locale: es })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}