'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { 
  Plus,
  Search,
  Download,
  FileText,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Filter,
  Printer,
  X,
  Mail,
  ShoppingCart,
  Minus
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  status: string
  payment_method: string
  subtotal: number
  discount: number
  tax_amount: number
  total: number
  clients: { full_name: string; phone: string; email: string }
  profiles: { full_name: string }
}

interface Client {
  id: string
  full_name: string
  email: string
  phone: string
}

interface Service {
  id: string
  name: string
  price: number
  description: string
}

interface Product {
  id: string
  product_name: string
  price: number
  current_quantity: number
}

interface InvoiceItem {
  type: 'service' | 'product'
  id: string
  name: string
  price: number
  quantity: number
  discount: number
  subtotal: number
}

export default function InvoicingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [invoiceItems, setInvoiceItems] = useState<any[]>([])
  const [sending, setSending] = useState(false)
  
  // Modal state
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [globalDiscount, setGlobalDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [notes, setNotes] = useState('')
  const [showItemSelector, setShowItemSelector] = useState(false)
  const [itemSearchTerm, setItemSearchTerm] = useState('')
  
  const [stats, setStats] = useState({
    todaySales: 0,
    monthlyRevenue: 0,
    pendingInvoices: 0,
    paidInvoices: 0
  })

  const supabase = createClient()

  useEffect(() => {
    initialize()
  }, [filterStatus])

  const initialize = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      window.location.href = '/login'
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile) {
      setUserRole(profile.role)
    }

    await Promise.all([
      loadInvoices(profile?.role, user.id),
      loadStats(profile?.role, user.id),
      loadClients(),
      loadServices(),
      loadProducts()
    ])

    setLoading(false)
  }

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, email, phone')
      .order('full_name', { ascending: true })

    if (data) setClients(data)
  }

  const loadServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, name, price, description')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (data) setServices(data)
  }

  const loadProducts = async () => {
    const { data } = await supabase
      .from('inventory')
      .select('id, product_name, price, current_quantity')
      .gt('current_quantity', 0)
      .order('product_name', { ascending: true })

    if (data) setProducts(data)
  }

  const loadInvoices = async (role: string, userId: string) => {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        clients(full_name, phone, email),
        profiles!invoices_employee_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false })

    if (role === 'estilista') {
      query = query.eq('employee_id', userId)
    }

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error cargando facturas:', error)
      return
    }

    setInvoices(data as any || [])
  }

  const loadStats = async (role: string, userId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

      // Ventas del día
      let todayQuery = supabase
        .from('invoices')
        .select('total')
        .eq('invoice_date', today)
        .eq('status', 'paid')

      if (role === 'estilista') {
        todayQuery = todayQuery.eq('employee_id', userId)
      }

      const { data: todayData } = await todayQuery
      const todaySales = todayData?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0

      // Ingresos del mes
      let monthQuery = supabase
        .from('invoices')
        .select('total')
        .gte('invoice_date', firstDayOfMonth)
        .eq('status', 'paid')

      if (role === 'estilista') {
        monthQuery = monthQuery.eq('employee_id', userId)
      }

      const { data: monthData } = await monthQuery
      const monthlyRevenue = monthData?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0

      // Facturas pendientes
      let pendingQuery = supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (role === 'estilista') {
        pendingQuery = pendingQuery.eq('employee_id', userId)
      }

      const { count: pendingCount } = await pendingQuery

      // Facturas pagadas
      let paidQuery = supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'paid')

      if (role === 'estilista') {
        paidQuery = paidQuery.eq('employee_id', userId)
      }

      const { count: paidCount } = await paidQuery

      setStats({
        todaySales,
        monthlyRevenue,
        pendingInvoices: pendingCount || 0,
        paidInvoices: paidCount || 0
      })
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    }
  }

  const addItem = (type: 'service' | 'product', item: Service | Product) => {
    const existingIndex = items.findIndex(i => i.id === item.id && i.type === type)
    
    if (existingIndex >= 0) {
      const updated = [...items]
      updated[existingIndex].quantity += 1
      updated[existingIndex].subtotal = updated[existingIndex].price * updated[existingIndex].quantity
      setItems(updated)
    } else {
      const newItem: InvoiceItem = {
        type,
        id: item.id,
        name: type === 'service' ? (item as Service).name : (item as Product).product_name,
        price: item.price,
        quantity: 1,
        discount: 0,
        subtotal: item.price
      }
      setItems([...items, newItem])
    }
    
    setShowItemSelector(false)
    setItemSearchTerm('')
  }

  const updateItemQuantity = (index: number, delta: number) => {
    const updated = [...items]
    const newQuantity = updated[index].quantity + delta
    
    if (newQuantity <= 0) {
      updated.splice(index, 1)
    } else {
      updated[index].quantity = newQuantity
      updated[index].subtotal = (updated[index].price * newQuantity) - updated[index].discount
    }
    
    setItems(updated)
  }

  const updateItemDiscount = (index: number, discount: number) => {
    const updated = [...items]
    updated[index].discount = discount
    updated[index].subtotal = (updated[index].price * updated[index].quantity) - discount
    setItems(updated)
  }

  const removeItem = (index: number) => {
    const updated = [...items]
    updated.splice(index, 1)
    setItems(updated)
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    const total = subtotal - globalDiscount
    
    return {
      subtotal,
      discount: globalDiscount,
      total: total > 0 ? total : 0
    }
  }

  const handleCreateInvoice = async () => {
    if (!selectedClient) {
      alert('Selecciona un cliente')
      return
    }

    if (items.length === 0) {
      alert('Agrega al menos un servicio o producto')
      return
    }

    setSending(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('No estás autenticado')
        setSending(false)
        return
      }

      const totals = calculateTotals()

      // Crear la factura
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          client_id: selectedClient.id,
          employee_id: user.id,
          created_by: user.id,
          invoice_date: new Date().toISOString().split('T')[0],
          status: 'paid',
          payment_method: paymentMethod,
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax_percentage: 0,
          tax_amount: 0,
          total: totals.total,
          notes: notes
        })
        .select()
        .single()

      if (invoiceError) {
        console.error('Error creando factura:', invoiceError)
        alert('Error al crear la factura: ' + invoiceError.message)
        setSending(false)
        return
      }

      // Crear los items de la factura
      const invoiceItems = items.map(item => ({
        invoice_id: invoice.id,
        item_type: item.type,
        item_id: item.id,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        discount: item.discount,
        subtotal: item.subtotal
      }))

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems)

      if (itemsError) {
        console.error('Error creando items:', itemsError)
      }

      // Enviar email al cliente
      await sendInvoiceEmail(invoice, selectedClient, items, totals)

      alert('¡Factura creada y enviada por correo exitosamente!')
      
      // Limpiar formulario
      setSelectedClient(null)
      setItems([])
      setGlobalDiscount(0)
      setPaymentMethod('cash')
      setNotes('')
      setShowCreateModal(false)
      
      // Recargar datos
      await loadInvoices(userRole, user.id)
      await loadStats(userRole, user.id)
      
    } catch (error) {
      console.error('Error inesperado:', error)
      alert('Error inesperado al crear la factura')
    }

    setSending(false)
  }

  const sendInvoiceEmail = async (invoice: any, client: any, items: any[], totals: any) => {
    try {
      if (!items || items.length === 0) {
        console.warn('No hay items para enviar en el email')
        return
      }

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #9333ea 0%, #db2777 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; }
            .invoice-details { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .items-table th { background: #f3f4f6; padding: 12px; text-align: left; }
            .items-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
            .total-row { background: #faf5ff; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✨ Estética Pro</h1>
              <p style="margin: 0; opacity: 0.9;">Tu factura está lista</p>
            </div>
            
            <div class="content">
              <div class="invoice-details">
                <h2 style="margin-top: 0;">Factura ${invoice.invoice_number}</h2>
                <p><strong>Cliente:</strong> ${client.full_name || client.clients?.full_name}</p>
                <p><strong>Fecha:</strong> ${format(new Date(invoice.invoice_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}</p>
                <p><strong>Método de pago:</strong> ${getPaymentMethodLabel(invoice.payment_method)}</p>
              </div>

              <table class="items-table">
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th>Cantidad</th>
                    <th>Precio</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(item => `
                    <tr>
                      <td>${item.item_name || item.name}</td>
                      <td>${item.quantity}</td>
                      <td>$${Number(item.unit_price || item.price).toLocaleString()}</td>
                      <td>$${Number(item.subtotal).toLocaleString()}</td>
                    </tr>
                  `).join('')}
                  <tr>
                    <td colspan="3" style="text-align: right; padding-top: 20px;"><strong>Subtotal:</strong></td>
                    <td style="padding-top: 20px;">$${Number(totals.subtotal).toLocaleString()}</td>
                  </tr>
                  ${totals.discount > 0 ? `
                    <tr>
                      <td colspan="3" style="text-align: right;"><strong>Descuento:</strong></td>
                      <td>-$${Number(totals.discount).toLocaleString()}</td>
                    </tr>
                  ` : ''}
                  <tr class="total-row">
                    <td colspan="3" style="text-align: right; font-size: 18px;"><strong>TOTAL:</strong></td>
                    <td style="font-size: 18px; color: #9333ea;">$${Number(totals.total).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              ${invoice.notes ? `
                <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px;">
                  <strong>Notas:</strong>
                  <p>${invoice.notes}</p>
                </div>
              ` : ''}
            </div>

            <div class="footer">
              <p>Gracias por tu preferencia 💜</p>
              <p>Estética Pro - Tu belleza, nuestra pasión</p>
            </div>
          </div>
        </body>
        </html>
      `

      // Enviar email usando la API
      const response = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: client.email || client.clients?.email,
          subject: `Factura ${invoice.invoice_number} - Estética Pro`,
          html: emailHtml
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error enviando email')
      }

      console.log('✅ Email enviado exitosamente a:', client.email || client.clients?.email)
      console.log('Respuesta:', result)
      
    } catch (error: any) {
      console.error('❌ Error enviando email:', error)
      throw error
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-700 border-green-200',
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
      refunded: 'bg-gray-100 text-gray-700 border-gray-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      paid: 'Pagada',
      pending: 'Pendiente',
      cancelled: 'Cancelada',
      refunded: 'Reembolsada'
    }
    return labels[status] || status
  }

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      paid: <CheckCircle2 className="w-4 h-4" />,
      pending: <Clock className="w-4 h-4" />,
      cancelled: <XCircle className="w-4 h-4" />,
      refunded: <RotateCcw className="w-4 h-4" />
    }
    return icons[status] || <Clock className="w-4 h-4" />
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Efectivo',
      transfer: 'Transferencia',
      card: 'Tarjeta',
      qr: 'QR',
      mixed: 'Mixto'
    }
    return labels[method] || method
  }

  const filteredInvoices = invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.clients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredClients = clients.filter(c =>
    c.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(clientSearch.toLowerCase())
  )

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(itemSearchTerm.toLowerCase())
  )

  const filteredProducts = products.filter(p =>
    p.product_name.toLowerCase().includes(itemSearchTerm.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta factura?')) return

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error al eliminar: ' + error.message)
      return
    }

    await loadInvoices(userRole, (await supabase.auth.getUser()).data.user?.id || '')
  }

  const handleViewInvoice = async (invoice: Invoice) => {
    // Cargar los items de la factura
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id)

    setSelectedInvoice(invoice)
    setInvoiceItems(items || [])
    setShowViewModal(true)
  }

  const handlePrintInvoice = async (invoice: Invoice) => {
    // Cargar los items de la factura
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id)

    // Crear HTML para imprimir
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Factura ${invoice.invoice_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            padding: 40px; 
            color: #333;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #9333ea;
          }
          .logo { 
            font-size: 32px; 
            font-weight: bold; 
            color: #9333ea;
            margin-bottom: 10px;
          }
          .invoice-number {
            font-size: 24px;
            font-weight: bold;
            color: #666;
            margin-top: 10px;
          }
          .info-section { 
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
          }
          .info-box {
            padding: 15px;
            background: #f9fafb;
            border-radius: 8px;
          }
          .info-box h3 {
            font-size: 14px;
            color: #9333ea;
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          .info-box p {
            margin: 5px 0;
            font-size: 14px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 30px;
          }
          th { 
            background: #f3f4f6; 
            padding: 12px; 
            text-align: left;
            font-size: 12px;
            text-transform: uppercase;
            color: #666;
          }
          td { 
            padding: 12px; 
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
          }
          .totals { 
            margin-left: auto; 
            width: 300px;
            padding: 20px;
            background: #faf5ff;
            border-radius: 8px;
          }
          .totals-row { 
            display: flex; 
            justify-content: space-between; 
            margin: 8px 0;
            font-size: 14px;
          }
          .total-final { 
            font-size: 20px; 
            font-weight: bold; 
            color: #9333ea;
            padding-top: 12px;
            border-top: 2px solid #9333ea;
            margin-top: 12px;
          }
          .notes {
            margin-top: 30px;
            padding: 15px;
            background: #f9fafb;
            border-left: 4px solid #9333ea;
            border-radius: 4px;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            color: #666;
            font-size: 12px;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">✨ Estética Pro</div>
          <p style="color: #666;">Tu belleza, nuestra pasión</p>
          <div class="invoice-number">Factura ${invoice.invoice_number}</div>
        </div>

        <div class="info-section">
          <div class="info-box">
            <h3>Cliente</h3>
            <p><strong>${invoice.clients?.full_name}</strong></p>
            <p>${invoice.clients?.email || ''}</p>
            <p>${invoice.clients?.phone || ''}</p>
          </div>
          <div class="info-box">
            <h3>Información de Pago</h3>
            <p><strong>Fecha:</strong> ${format(new Date(invoice.invoice_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}</p>
            <p><strong>Método:</strong> ${getPaymentMethodLabel(invoice.payment_method)}</p>
            <p><strong>Estado:</strong> ${getStatusLabel(invoice.status)}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Descripción</th>
              <th style="text-align: center;">Cantidad</th>
              <th style="text-align: right;">Precio Unit.</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${items?.map(item => `
              <tr>
                <td>
                  <strong>${item.item_name}</strong>
                  ${item.description ? `<br><small style="color: #666;">${item.description}</small>` : ''}
                </td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">$${Number(item.unit_price).toLocaleString()}</td>
                <td style="text-align: right;"><strong>$${Number(item.subtotal).toLocaleString()}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal:</span>
            <strong>$${Number(invoice.subtotal).toLocaleString()}</strong>
          </div>
          ${invoice.discount > 0 ? `
            <div class="totals-row" style="color: #dc2626;">
              <span>Descuento:</span>
              <strong>-$${Number(invoice.discount).toLocaleString()}</strong>
            </div>
          ` : ''}
          <div class="totals-row total-final">
            <span>TOTAL:</span>
            <strong>$${Number(invoice.total).toLocaleString()}</strong>
          </div>
        </div>

        ${invoice.notes ? `
          <div class="notes">
            <h3 style="margin-bottom: 8px; color: #9333ea;">Notas:</h3>
            <p>${invoice.notes}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>Gracias por tu preferencia 💜</p>
          <p style="margin-top: 5px;">Estética Pro - ${new Date().getFullYear()}</p>
        </div>

        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="
            padding: 12px 24px;
            background: linear-gradient(135deg, #9333ea 0%, #db2777 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            margin-right: 10px;
          ">Imprimir</button>
          <button onclick="window.close()" style="
            padding: 12px 24px;
            background: #e5e7eb;
            color: #374151;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
          ">Cerrar</button>
        </div>
      </body>
      </html>
    `

    printWindow.document.write(printHtml)
    printWindow.document.close()
  }

  const handleResendEmail = async (invoice: Invoice) => {
    const clientEmail = invoice.clients?.email
    
    if (!clientEmail) {
      alert('El cliente no tiene email registrado')
      return
    }

    if (!confirm('¿Enviar la factura por correo a ' + clientEmail + '?')) return

    setSending(true)

    try {
      // Cargar los items de la factura
      const { data: items, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id)

      if (error) {
        throw error
      }

      if (!items || items.length === 0) {
        throw new Error('No se encontraron items en la factura')
      }

      const totals = {
        subtotal: invoice.subtotal,
        discount: invoice.discount,
        total: invoice.total
      }

      await sendInvoiceEmail(invoice, invoice.clients, items, totals)
      alert('¡Factura enviada por correo!')
    } catch (error: any) {
      console.error('Error enviando email:', error)
      alert('Error al enviar el correo: ' + (error.message || 'Error desconocido'))
    }

    setSending(false)
  }

  const totals = calculateTotals()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-purple-50/30">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando facturación...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 p-8">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Facturación</h1>
          <p className="text-gray-600 mt-1">Gestiona tus ventas y pagos</p>
        </div>
        
        {(userRole === 'admin' || userRole === 'cajero') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            Nueva Factura
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Ventas del Día */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
          <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-green-200 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                <DollarSign className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Ventas del Día</p>
            <p className="text-3xl font-bold text-gray-900">${stats.todaySales.toLocaleString()}</p>
          </div>
        </div>

        {/* Ingresos del Mes */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
          <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-purple-200 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Calendar className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Ingresos del Mes</p>
            <p className="text-3xl font-bold text-gray-900">${stats.monthlyRevenue.toLocaleString()}</p>
          </div>
        </div>

        {/* Facturas Pendientes */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
          <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-amber-200 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Clock className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Facturas Pendientes</p>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingInvoices}</p>
          </div>
        </div>

        {/* Facturas Pagadas */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
          <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <CheckCircle2 className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Facturas Pagadas</p>
            <p className="text-3xl font-bold text-gray-900">{stats.paidInvoices}</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" strokeWidth={2} />
            <input
              type="text"
              placeholder="Buscar por número de factura o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                filterStatus === 'all'
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterStatus('paid')}
              className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                filterStatus === 'paid'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pagadas
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                filterStatus === 'pending'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pendientes
            </button>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">
            Facturas ({filteredInvoices.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  N° Factura
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Método Pago
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-purple-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">{invoice.invoice_number}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{invoice.clients?.full_name}</p>
                      <p className="text-xs text-gray-500">{invoice.clients?.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {format(new Date(invoice.invoice_date), 'dd MMM yyyy', { locale: es })}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">
                      {getPaymentMethodLabel(invoice.payment_method)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-lg font-bold text-gray-900">
                      ${invoice.total.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${getStatusColor(invoice.status)}`}>
                      {getStatusIcon(invoice.status)}
                      {getStatusLabel(invoice.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewInvoice(invoice)}
                        className="w-9 h-9 bg-blue-100 hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors"
                        title="Ver factura"
                      >
                        <Eye className="w-4 h-4 text-blue-600" strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => handlePrintInvoice(invoice)}
                        className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                        title="Imprimir"
                      >
                        <Printer className="w-4 h-4 text-gray-600" strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => handleResendEmail(invoice)}
                        disabled={sending}
                        className="w-9 h-9 bg-purple-100 hover:bg-purple-200 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                        title="Enviar por email"
                      >
                        <Mail className="w-4 h-4 text-purple-600" strokeWidth={2} />
                      </button>
                      {(userRole === 'admin' || userRole === 'cajero') && (
                        <>
                          {userRole === 'admin' && (
                            <button
                              onClick={() => handleDelete(invoice.id)}
                              className="w-9 h-9 bg-red-100 hover:bg-red-200 rounded-lg flex items-center justify-center transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" strokeWidth={2} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredInvoices.length === 0 && (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-gray-500 font-medium">No se encontraron facturas</p>
              <p className="text-gray-400 text-sm mt-1">Intenta con otro filtro o término de búsqueda</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nueva Factura */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-8">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-5 flex items-center justify-between sticky top-0 z-10 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Nueva Factura</h2>
                  <p className="text-purple-100 text-sm">Completa los datos para generar la factura</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
              >
                <X className="w-6 h-6 text-white" strokeWidth={2} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column - Cliente y Items */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Selección de Cliente */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-600" strokeWidth={2.5} />
                      Cliente
                    </h3>
                    
                    {!selectedClient ? (
                      <>
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" strokeWidth={2} />
                          <input
                            type="text"
                            placeholder="Buscar cliente por nombre o email..."
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm"
                          />
                        </div>
                        
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {filteredClients.slice(0, 5).map(client => (
                            <button
                              key={client.id}
                              onClick={() => {
                                setSelectedClient(client)
                                setClientSearch('')
                              }}
                              className="w-full text-left p-3 bg-white hover:bg-purple-50 rounded-lg transition-colors border border-gray-100 hover:border-purple-200"
                            >
                              <p className="font-semibold text-gray-900">{client.full_name}</p>
                              <p className="text-xs text-gray-600">{client.email} • {client.phone}</p>
                            </button>
                          ))}
                          {filteredClients.length === 0 && (
                            <p className="text-center text-gray-500 py-4 text-sm">No se encontraron clientes</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between p-4 bg-white border-2 border-purple-200 rounded-xl">
                        <div>
                          <p className="font-bold text-gray-900">{selectedClient.full_name}</p>
                          <p className="text-sm text-gray-600">{selectedClient.email}</p>
                          <p className="text-sm text-gray-600">{selectedClient.phone}</p>
                        </div>
                        <button
                          onClick={() => setSelectedClient(null)}
                          className="w-8 h-8 bg-red-100 hover:bg-red-200 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <X className="w-4 h-4 text-red-600" strokeWidth={2} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Items */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-purple-600" strokeWidth={2.5} />
                        Servicios y Productos
                      </h3>
                      <button
                        onClick={() => setShowItemSelector(!showItemSelector)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                        Agregar
                      </button>
                    </div>

                    {showItemSelector && (
                      <div className="mb-4 p-4 bg-white rounded-lg border border-purple-200">
                        <input
                          type="text"
                          placeholder="Buscar servicio o producto..."
                          value={itemSearchTerm}
                          onChange={(e) => setItemSearchTerm(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-purple-300 focus:ring-2 focus:ring-purple-100 outline-none text-sm mb-3"
                        />
                        
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {filteredServices.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Servicios</p>
                              {filteredServices.map(service => (
                                <button
                                  key={service.id}
                                  onClick={() => addItem('service', service)}
                                  className="w-full text-left p-3 bg-gray-50 hover:bg-purple-50 rounded-lg transition-colors mb-1 border border-gray-100"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900">{service.name}</span>
                                    <span className="font-bold text-purple-600">${service.price.toLocaleString()}</span>
                                  </div>
                                  {service.description && (
                                    <p className="text-xs text-gray-500 mt-1">{service.description}</p>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                          
                          {filteredProducts.length > 0 && (
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Productos</p>
                              {filteredProducts.map(product => (
                                <button
                                  key={product.id}
                                  onClick={() => addItem('product', product)}
                                  className="w-full text-left p-3 bg-gray-50 hover:bg-purple-50 rounded-lg transition-colors mb-1 border border-gray-100"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900">{product.product_name}</span>
                                    <div className="text-right">
                                      <span className="font-bold text-purple-600">${product.price.toLocaleString()}</span>
                                      <p className="text-xs text-gray-500">Stock: {product.current_quantity}</p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Lista de Items */}
                    <div className="space-y-3">
                      {items.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" strokeWidth={1.5} />
                          <p className="text-sm">No hay items agregados</p>
                        </div>
                      ) : (
                        items.map((item, index) => (
                          <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">{item.name}</p>
                                <p className="text-sm text-gray-500">{item.type === 'service' ? 'Servicio' : 'Producto'}</p>
                              </div>
                              <button
                                onClick={() => removeItem(index)}
                                className="w-7 h-7 bg-red-100 hover:bg-red-200 rounded-lg flex items-center justify-center transition-colors"
                              >
                                <X className="w-4 h-4 text-red-600" strokeWidth={2} />
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-gray-600 mb-1 block">Cantidad</label>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => updateItemQuantity(index, -1)}
                                    className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                                  >
                                    <Minus className="w-4 h-4 text-gray-600" strokeWidth={2} />
                                  </button>
                                  <span className="font-bold text-gray-900">{item.quantity}</span>
                                  <button
                                    onClick={() => updateItemQuantity(index, 1)}
                                    className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                                  >
                                    <Plus className="w-4 h-4 text-gray-600" strokeWidth={2} />
                                  </button>
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-xs text-gray-600 mb-1 block">Descuento</label>
                                <input
                                  type="number"
                                  value={item.discount}
                                  onChange={(e) => updateItemDiscount(index, Number(e.target.value))}
                                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                  min="0"
                                />
                              </div>
                            </div>
                            
                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                              <span className="text-sm text-gray-600">
                                ${item.price.toLocaleString()} × {item.quantity}
                              </span>
                              <span className="font-bold text-purple-600">
                                ${item.subtotal.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Resumen */}
                <div className="space-y-6">
                  
                  {/* Método de Pago */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-purple-600" strokeWidth={2.5} />
                      Método de Pago
                    </h3>
                    
                    <div className="space-y-2">
                      {['cash', 'transfer', 'card', 'qr', 'mixed'].map(method => (
                        <button
                          key={method}
                          onClick={() => setPaymentMethod(method)}
                          className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all ${
                            paymentMethod === method
                              ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg'
                              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {getPaymentMethodLabel(method)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Descuento Global */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <label className="text-sm font-bold text-gray-900 mb-2 block">
                      Descuento Global
                    </label>
                    <input
                      type="number"
                      value={globalDiscount}
                      onChange={(e) => setGlobalDiscount(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                      min="0"
                      placeholder="$0"
                    />
                  </div>

                  {/* Resumen de Totales */}
                  <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-xl p-5 border-2 border-purple-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Resumen</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-gray-700">
                        <span>Subtotal:</span>
                        <span className="font-semibold">${totals.subtotal.toLocaleString()}</span>
                      </div>
                      
                      {totals.discount > 0 && (
                        <div className="flex items-center justify-between text-red-600">
                          <span>Descuento:</span>
                          <span className="font-semibold">-${totals.discount.toLocaleString()}</span>
                        </div>
                      )}
                      
                      <div className="pt-3 border-t-2 border-purple-200 flex items-center justify-between">
                        <span className="text-xl font-bold text-gray-900">TOTAL:</span>
                        <span className="text-2xl font-bold text-purple-600">
                          ${totals.total.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notas */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <label className="text-sm font-bold text-gray-900 mb-2 block">
                      Notas (Opcional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observaciones adicionales..."
                      rows={3}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-purple-300 focus:ring-4 focus:ring-purple-100 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 sticky bottom-0 rounded-b-2xl">
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={sending}
                className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={!selectedClient || items.length === 0 || sending}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creando y Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" strokeWidth={2} />
                    Crear y Enviar por Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Factura */}
      {showViewModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Factura {selectedInvoice.invoice_number}</h2>
                <p className="text-purple-100 text-sm">
                  {format(new Date(selectedInvoice.invoice_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
              </div>
              <button 
                onClick={() => setShowViewModal(false)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
              >
                <X className="w-6 h-6 text-white" strokeWidth={2} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              
              {/* Info del Cliente y Pago */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Cliente</h3>
                  <p className="font-bold text-gray-900 text-lg">{selectedInvoice.clients?.full_name}</p>
                  <p className="text-gray-600">{selectedInvoice.clients?.email}</p>
                  <p className="text-gray-600">{selectedInvoice.clients?.phone}</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Información de Pago</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Método:</span>
                      <span className="font-semibold text-gray-900">{getPaymentMethodLabel(selectedInvoice.payment_method)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Estado:</span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(selectedInvoice.status)}`}>
                        {getStatusIcon(selectedInvoice.status)}
                        {getStatusLabel(selectedInvoice.status)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Atendió:</span>
                      <span className="font-semibold text-gray-900">{selectedInvoice.profiles?.full_name}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Detalle de Items</h3>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Descripción</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Cant.</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Precio Unit.</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoiceItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{item.item_name}</p>
                            <p className="text-xs text-gray-500">{item.item_type === 'service' ? 'Servicio' : 'Producto'}</p>
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-gray-700">${Number(item.unit_price).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900">${Number(item.subtotal).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totales */}
              <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-xl p-6 border-2 border-purple-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-gray-700">
                    <span className="font-medium">Subtotal:</span>
                    <span className="font-bold">${Number(selectedInvoice.subtotal).toLocaleString()}</span>
                  </div>
                  
                  {selectedInvoice.discount > 0 && (
                    <div className="flex items-center justify-between text-red-600">
                      <span className="font-medium">Descuento:</span>
                      <span className="font-bold">-${Number(selectedInvoice.discount).toLocaleString()}</span>
                    </div>
                  )}
                  
                  <div className="pt-3 border-t-2 border-purple-200 flex items-center justify-between">
                    <span className="text-xl font-bold text-gray-900">TOTAL:</span>
                    <span className="text-3xl font-bold text-purple-600">
                      ${Number(selectedInvoice.total).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notas */}
              {selectedInvoice.notes && (
                <div className="mt-6 bg-gray-50 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Notas</h3>
                  <p className="text-gray-700">{selectedInvoice.notes}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowViewModal(false)}
                className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  handlePrintInvoice(selectedInvoice)
                  setShowViewModal(false)
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" strokeWidth={2} />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}