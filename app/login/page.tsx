'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Sparkles, Calendar, Package, TrendingUp, CreditCard, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Credenciales incorrectas. Por favor, intenta de nuevo.')
      setLoading(false)
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden">
      {/* Fondo base con el mismo color de la imagen */}
      <div className="absolute inset-0 bg-[#1a0a2e]"></div>
      
      {/* Gradiente de integración para que la imagen se mezcle perfectamente */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a2e] via-[#2d1548] to-[#3d1a5f]"></div>

      {/* Efectos de luz ambiente */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-1/4 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-20 left-1/4 w-[500px] h-[500px] bg-fuchsia-600/15 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Partículas brillantes */}
      <div className="absolute inset-0 pointer-events-none hidden lg:block">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-purple-300/40 rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `twinkle ${2 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Círculos decorativos */}
      <div className="absolute top-1/4 right-1/3 w-64 h-64 border-2 border-purple-400/20 rounded-full hidden lg:block"></div>
      <div className="absolute top-1/3 right-1/3 w-48 h-48 border border-purple-300/15 rounded-full transform translate-x-8 hidden lg:block"></div>

      <div className="relative z-10 flex flex-col lg:flex-row w-full min-h-screen">
        
        {/* LADO IZQUIERDO - HERO */}
        <div className="w-full lg:w-[55%] xl:w-[60%] relative p-6 sm:p-8 md:p-10 lg:p-12 xl:p-16 flex flex-col justify-between min-h-[40vh] lg:min-h-screen">
          
          {/* Logo y Header */}
          <div className="space-y-6 lg:space-y-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-2xl lg:rounded-[20px] blur-md lg:blur-lg opacity-75"></div>
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-fuchsia-500 via-purple-500 to-purple-600 rounded-2xl lg:rounded-[20px] flex items-center justify-center shadow-2xl">
                  <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 lg:w-9 lg:h-9 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-3xl font-bold text-white">Estética Pro</h1>
                <p className="text-gray-300 text-xs sm:text-sm">Sistema de Gestión Integral</p>
              </div>
            </div>

            {/* Título Principal */}
            <div className="space-y-3 lg:space-y-4">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight">
                Gestiona tu negocio<br />
                de forma <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400">inteligente</span>
              </h2>
              <p className="text-gray-300 text-base sm:text-lg lg:text-xl leading-relaxed max-w-xl">
                Control completo de clientes, citas, inventario y facturación desde una plataforma moderna y profesional.
              </p>
            </div>

            {/* Cards de Features 2x2 - Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-4 max-w-2xl">
              {/* Card 1 */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/40 to-fuchsia-600/40 rounded-xl lg:rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl lg:rounded-2xl p-4 sm:p-5 hover:border-purple-500/50 transition-all duration-300">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg lg:rounded-xl flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm sm:text-base mb-1">Citas y Agenda</h3>
                      <p className="text-gray-400 text-xs leading-relaxed hidden sm:block">
                        Calendario inteligente y recordatorios automáticos.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/40 to-fuchsia-600/40 rounded-xl lg:rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl lg:rounded-2xl p-4 sm:p-5 hover:border-purple-500/50 transition-all duration-300">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 rounded-lg lg:rounded-xl flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm sm:text-base mb-1">Inventario</h3>
                      <p className="text-gray-400 text-xs leading-relaxed hidden sm:block">
                        Control en tiempo real de productos y stock.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/40 to-fuchsia-600/40 rounded-xl lg:rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl lg:rounded-2xl p-4 sm:p-5 hover:border-purple-500/50 transition-all duration-300">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-lg lg:rounded-xl flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm sm:text-base mb-1">Reportes</h3>
                      <p className="text-gray-400 text-xs leading-relaxed hidden sm:block">
                        Estadísticas avanzadas para tomar mejores decisiones.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4 */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/40 to-fuchsia-600/40 rounded-xl lg:rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl lg:rounded-2xl p-4 sm:p-5 hover:border-purple-500/50 transition-all duration-300">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-lg lg:rounded-xl flex items-center justify-center shrink-0">
                      <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm sm:text-base mb-1">Facturación</h3>
                      <p className="text-gray-400 text-xs leading-relaxed hidden sm:block">
                        Facturación automática y control de pagos en un solo lugar.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Imagen de Mujer en Tratamiento - Responsive */}
          <div className="relative mt-6 lg:mt-8 hidden md:block">
            <div className="relative w-full h-48 sm:h-56 md:h-64 lg:h-80 xl:h-96 overflow-hidden rounded-2xl lg:rounded-3xl">
              {/* Gradiente de integración para que se mezcle con el fondo */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a0a2e]/40 via-transparent to-transparent z-10"></div>
<div className="absolute inset-0 bg-gradient-to-r from-[#2d1548]/20 via-transparent to-transparent z-10"></div>
              
              {/* Imagen optimizada */}
                <img 
                src="https://fruttco.site/wp-content/uploads/2026/05/1d432f4c-49e6-4628-8b4b-9492e4bca080.png"
                alt="Tratamiento estético"
                className="w-full h-full object-cover object-center"
                style={{
                    objectPosition: "center center"
                }}
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src =
                    "https://fruttco.site/wp-content/uploads/2026/05/1d432f4c-49e6-4628-8b4b-9492e4bca080.png";
                }}
                />
              
              {/* Efecto de velas/luz decorativa */}
              <div className="absolute bottom-4 left-4 lg:bottom-8 lg:left-8 flex gap-2 lg:gap-3 z-20">
                <div className="w-2 h-8 lg:w-3 lg:h-12 bg-gradient-to-t from-fuchsia-400 to-fuchsia-200 rounded-full blur-sm opacity-80"></div>
                <div className="w-2 h-10 lg:w-3 lg:h-16 bg-gradient-to-t from-purple-400 to-purple-200 rounded-full blur-sm opacity-80"></div>
                <div className="w-2 h-6 lg:w-3 lg:h-10 bg-gradient-to-t from-fuchsia-300 to-fuchsia-100 rounded-full blur-sm opacity-80"></div>
              </div>
            </div>
          </div>
        </div>

        {/* LADO DERECHO - FORMULARIO - Responsive */}
        <div className="w-full lg:w-[45%] xl:w-[40%] flex items-center justify-center p-6 sm:p-8 lg:p-12 xl:p-16 relative">
          
          {/* Card de Login - Responsive */}
          <div className="w-full max-w-md relative">
            <div className="relative bg-white rounded-2xl sm:rounded-3xl lg:rounded-[32px] shadow-2xl p-6 sm:p-8 lg:p-10 xl:p-12">
              
              {/* Header */}
              <div className="mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl lg:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  Bienvenido de nuevo <span className="text-2xl sm:text-3xl">👋</span>
                </h2>
                <p className="text-gray-600 text-sm sm:text-base">
                  Inicia sesión para continuar
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl lg:rounded-2xl">
                  <p className="text-xs sm:text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" strokeWidth={2} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      className="block w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:border-purple-600 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-gray-900 placeholder-gray-400 text-sm sm:text-base"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" strokeWidth={2} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="block w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-3 sm:py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:border-purple-600 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-gray-900 text-sm sm:text-base"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-gray-400 hover:text-purple-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </button>
                  </div>
                </div>

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="ml-2 text-xs sm:text-sm text-gray-700">
                      Recordarme
                    </span>
                  </label>
                  <button
                    type="button"
                    className="text-xs sm:text-sm text-purple-600 hover:text-purple-700 font-semibold"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {/* Submit Button con Gradiente - Responsive */}
                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full group mt-4 sm:mt-6"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold py-3 sm:py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base">
                    {loading ? (
                      <>
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Iniciando sesión...</span>
                      </>
                    ) : (
                      <>
                        <span>INICIAR SESIÓN</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                      </>
                    )}
                  </div>
                </button>
              </form>

              {/* Footer */}
              <p className="text-center text-xs text-gray-500 mt-6 sm:mt-8">
                © 2026 Estética Pro. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { 
            opacity: 0.2; 
            transform: scale(1); 
          }
          50% { 
            opacity: 1; 
            transform: scale(1.5); 
          }
        }
      `}</style>
    </div>
  )
}