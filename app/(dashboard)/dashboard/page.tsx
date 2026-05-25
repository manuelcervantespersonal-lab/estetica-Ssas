import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { DollarSign, Calendar, Users, Package, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Bienvenido de nuevo, aquí está el resumen de hoy</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Ingresos */}
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Ingresos del Mes
              </CardTitle>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">$12,450</p>
              <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                <TrendingUp className="w-4 h-4" />
                +12%
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">vs mes anterior</p>
          </CardContent>
        </Card>

        {/* Citas Hoy */}
        <Card className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Citas Hoy
              </CardTitle>
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">8</p>
              <Badge variant="warning" className="text-xs">
                3 pendientes
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">5 completadas</p>
          </CardContent>
        </Card>

        {/* Clientes Nuevos */}
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Clientes Nuevos
              </CardTitle>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">24</p>
              <div className="flex items-center gap-1 text-blue-600 text-sm font-medium">
                <TrendingUp className="w-4 h-4" />
                +8
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">este mes</p>
          </CardContent>
        </Card>

        {/* Stock Bajo */}
        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Alertas de Stock
              </CardTitle>
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Package className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">5</p>
              <Badge variant="destructive" className="text-xs">
                Urgente
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">productos requieren atención</p>
          </CardContent>
        </Card>
      </div>

      {/* Segunda Fila - Grid de 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Próximas Citas */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Próximas Citas</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Agenda de hoy</p>
              </div>
              <Badge variant="default" className="bg-primary">
                8 citas
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Cita 1 */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-xl border border-primary/10 hover:shadow-md transition-all">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">María García</p>
                    <Badge variant="success" className="text-xs">Confirmada</Badge>
                  </div>
                  <p className="text-sm text-gray-600">Corte de Cabello · 60 min</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-primary text-lg">10:00 AM</p>
                  <p className="text-xs text-gray-500">Ana Martínez</p>
                </div>
              </div>

              {/* Cita 2 */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-all">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">Laura Pérez</p>
                    <Badge variant="warning" className="text-xs">Pendiente</Badge>
                  </div>
                  <p className="text-sm text-gray-600">Tinte + Corte · 120 min</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900 text-lg">11:30 AM</p>
                  <p className="text-xs text-gray-500">Carmen López</p>
                </div>
              </div>

              {/* Cita 3 */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-all">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">Sofía Martínez</p>
                    <Badge variant="warning" className="text-xs">Pendiente</Badge>
                  </div>
                  <p className="text-sm text-gray-600">Manicure · 45 min</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900 text-lg">2:00 PM</p>
                  <p className="text-xs text-gray-500">Ana Martínez</p>
                </div>
              </div>
            </div>

            <button className="w-full mt-4 py-3 text-primary hover:bg-primary/5 rounded-xl font-medium transition-colors">
              Ver todas las citas →
            </button>
          </CardContent>
        </Card>

        {/* Resumen Rápido */}
        <Card>
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-lg">Resumen Rápido</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Estadísticas de hoy</p>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Completadas */}
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-700">Completadas</span>
                </div>
                <span className="text-xl font-bold text-green-600">5</span>
              </div>

              {/* Pendientes */}
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-gray-700">Pendientes</span>
                </div>
                <span className="text-xl font-bold text-yellow-600">3</span>
              </div>

              {/* Canceladas */}
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-gray-700">Canceladas</span>
                </div>
                <span className="text-xl font-bold text-red-600">0</span>
              </div>

              {/* Ingresos Hoy */}
              <div className="mt-6 p-4 bg-gradient-to-br from-primary to-primary-dark rounded-xl text-white">
                <p className="text-sm opacity-90 mb-1">Ingresos de Hoy</p>
                <p className="text-3xl font-bold">$2,340</p>
                <p className="text-sm opacity-75 mt-1">5 servicios completados</p>
              </div>

              {/* Servicios Populares */}
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Servicios Populares</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Corte de Cabello</span>
                    <span className="font-semibold text-gray-900">15</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Manicure</span>
                    <span className="font-semibold text-gray-900">12</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Tinte</span>
                    <span className="font-semibold text-gray-900">8</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}