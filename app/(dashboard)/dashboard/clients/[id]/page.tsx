'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Phone, Mail, CreditCard, Calendar,
  DollarSign, CheckCircle2, Clock, XCircle,
  AlertCircle, Scissors, TrendingUp
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Client {
  id: string
  cedula: string
  full_name: string
  phone: string
  email: string
  created_at: string
}

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  status: string
  services: { name: string; price: number; duration_minutes: number }
  profiles: { full_name: string }
}

interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  total: number
  status: string
  payment_method: string
}

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'appointments' | 'invoices'>('appointments')

  const supabase = createClient()

  useEffect(() => { initialize() }, [clientId])

  const initialize = async () => {
    await Promise.all([loadClient(), loadAppointments(), loadInvoices()])
    setLoading(false)
  }

  const loadClient = async () => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()
    if (data) setClient(data)
  }

  const loadAppointments = async () => {
    const { data } = await supabase
      .from('appointments')
      .select(`
        id, appointment_date, appointment_time, status,
        services(name, price, duration_minutes),
        profiles!appointments_employee_id_fkey(full_name)
      `)
      .eq('client_id', clientId)
      .order('appointment_date', { ascending: false })

    if (data) setAppointments(data as any)
  }

  const loadInvoices = async () => {
    const { data } = await supabase
      .from('invoices')
      .select('id, invoice_number, invoice_date, total, status, payment_method')
      .eq('client_id', clientId)
      .order('invoice_date', { ascending: false })

    if (data) setInvoices(data)
  }

  const totalGastado = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.total), 0)

  const citasCompletadas = appointments.filter(a => a.status === 'completed').length
  const ultimaVisita = appointments.find(a => a.status === 'completed')?.appointment_date

  const getStatusColor = (status: string) => ({
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-cyan-100 text-cyan-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    no_show: 'bg-gray-100 text-gray-600',
    paid: 'bg-green-100 text-green-700',
  }[status] || 'bg-gray-100 text-gray-600')

  const getStatusLabel = (status: string) => ({
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    completed: 'Completada',
    cancelled: 'Cancelada',
    no_show: 'No llegó',
    paid: 'Pagada',
  }[status] || status)

  const getStatusIcon = (status: string) => ({
    completed: <CheckCircle2 className="w-3.5 h-3.5" />,
    paid: <CheckCircle2 className="w-3.5 h-3.5" />,
    pending: <Clock className="w-3.5 h-3.5" />,
    confirmed: <Clock className="w-3.5 h-3.5" />,
    cancelled: <XCircle className="w-3.5 h-3.5" />,
    no_show: <AlertCircle className="w-3.5 h-3.5" />,
  }[status] || <Clock className="w-3.5 h-3.5" />)

  const getPaymentMethodLabel = (method: string) => ({
    cash: 'Efectivo', transfer: 'Transferencia',
    card: 'Tarjeta', qr: 'QR', mixed: 'Mixto'
  }[method] || method)

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )

  if (!client) return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-500">Cliente no encontrado</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 p-8">

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/dashboard/clients')}
          className="w-10 h-10 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl flex items-center justify-center transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5 text-gray-600" strokeWidth={2} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{client.full_name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Perfil del cliente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Columna izquierda — Datos del cliente */}
        <div className="space-y-6">

          {/* Tarjeta principal */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 p-6 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-3xl">
                  {client.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white">{client.full_name}</h2>
              <p className="text-purple-100 text-sm mt-1">
                Cliente desde {format(new Date(client.created_at), "MMMM 'de' yyyy", { locale: es })}
              </p>
            </div>

            <div className="p-5 space-y-3">
              {client.cedula && (
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4 text-gray-500" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Cédula</p>
                    <p className="font-semibold text-sm">{client.cedula}</p>
                  </div>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-gray-500" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Teléfono</p>
                    <p className="font-semibold text-sm">{client.phone}</p>
                  </div>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-gray-500" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Correo</p>
                    <p className="font-semibold text-sm">{client.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats del cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <p className="text-2xl font-bold text-gray-900">${totalGastado.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Total gastado</p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Scissors className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{citasCompletadas}</p>
              <p className="text-xs text-gray-500 mt-1">Visitas</p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ${citasCompletadas > 0 ? Math.round(totalGastado / citasCompletadas).toLocaleString() : 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Gasto promedio</p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <p className="text-sm font-bold text-gray-900">
                {ultimaVisita
                  ? format(new Date(ultimaVisita), 'd MMM yyyy', { locale: es })
                  : '—'
                }
              </p>
              <p className="text-xs text-gray-500 mt-1">Última visita</p>
            </div>
          </div>
        </div>

        {/* Columna derecha — Historial */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setActiveTab('appointments')}
                className={`flex-1 px-6 py-4 font-semibold text-sm transition-all ${
                  activeTab === 'appointments'
                    ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}>
                📅 Citas ({appointments.length})
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`flex-1 px-6 py-4 font-semibold text-sm transition-all ${
                  activeTab === 'invoices'
                    ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}>
                💳 Facturas ({invoices.length})
              </button>
            </div>

            {/* Tab Citas */}
            {activeTab === 'appointments' && (
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {appointments.length === 0 ? (
                  <div className="text-center py-16">
                    <Calendar className="w-16 h-16 text-gray-200 mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-gray-500 font-medium">Sin citas registradas</p>
                  </div>
                ) : (
                  appointments.map(apt => (
                    <div key={apt.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-center shrink-0">
                            <p className="text-lg font-bold text-gray-900">
                              {format(new Date(apt.appointment_date + 'T12:00:00'), 'd', { locale: es })}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {format(new Date(apt.appointment_date + 'T12:00:00'), 'MMM', { locale: es })}
                            </p>
                            <p className="text-xs text-gray-400">
                              {format(new Date(apt.appointment_date + 'T12:00:00'), 'yyyy', { locale: es })}
                            </p>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{apt.services?.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {apt.appointment_time?.substring(0, 5)} · {apt.services?.duration_minutes} min · {apt.profiles?.full_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <p className="font-bold text-purple-600">
                            ${Number(apt.services?.price || 0).toLocaleString()}
                          </p>
                          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${getStatusColor(apt.status)}`}>
                            {getStatusIcon(apt.status)}
                            {getStatusLabel(apt.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab Facturas */}
            {activeTab === 'invoices' && (
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {invoices.length === 0 ? (
                  <div className="text-center py-16">
                    <DollarSign className="w-16 h-16 text-gray-200 mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-gray-500 font-medium">Sin facturas registradas</p>
                  </div>
                ) : (
                  invoices.map(inv => (
                    <div key={inv.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900">{inv.invoice_number}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {format(new Date(inv.invoice_date + 'T12:00:00'), "d 'de' MMMM yyyy", { locale: es })} · {getPaymentMethodLabel(inv.payment_method)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <p className="text-xl font-bold text-gray-900">
                            ${Number(inv.total).toLocaleString()}
                          </p>
                          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${getStatusColor(inv.status)}`}>
                            {getStatusIcon(inv.status)}
                            {getStatusLabel(inv.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}