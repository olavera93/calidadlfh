import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, AlertCircle, User, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/utils'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(u, p) {
    setError('')
    setLoading(true)
    try {
      await login(u, p)
      navigate('/temperaturas', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Error al iniciar sesión. Verifica tus credenciales.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#060b17] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      
      {/* Halo de luz de fondo para dar contraste con la sombra */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-cyan-500/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Tarjeta con sombra doble (profunda + resplandor azul cyan) */}
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_40px_rgba(6,182,212,0.25)] border border-slate-800/80 overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
        
        {/* Panel Izquierdo: Azul marino oscuro del Dashboard */}
        <div className="relative bg-[#0b1329] p-8 md:p-12 text-white flex flex-col justify-between overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-cyan-700/10 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500 flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/30">
              <FlaskConical size={24} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Calidad</h1>
            <p className="text-cyan-400/80 font-medium text-sm mt-0.5">Farmacéutica</p>
          </div>

          <div className="relative z-10 my-8 space-y-3.5 hidden md:block">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <CheckCircle2 size={16} className="text-cyan-400 shrink-0" />
              <span>Monitoreo continuo de temperaturas</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <CheckCircle2 size={16} className="text-cyan-400 shrink-0" />
              <span>Control e historial por sedes</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <CheckCircle2 size={16} className="text-cyan-400 shrink-0" />
              <span>Gestión de recepciones y vencimientos</span>
            </div>
          </div>

          <p className="relative z-10 text-2xs text-slate-500">
            © {new Date().getFullYear()} Sistema de Calidad Farmacéutica
          </p>
        </div>

        {/* Panel Derecho: Fondo Claro para Máximo Contraste */}
        <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Iniciar Sesión</h2>
              <p className="text-sm text-slate-500 mt-1">Ingresa tus credenciales para acceder</p>
            </div>

            <form onSubmit={e => { e.preventDefault(); handleLogin(username, password) }} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Usuario</label>
                <div className="relative">
                  <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    autoFocus
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all text-slate-800 placeholder-slate-400"
                    placeholder="Nombre de usuario"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Contraseña</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all text-slate-800 placeholder-slate-400"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full py-3 px-4 rounded-xl font-medium text-sm text-white bg-[#06b6d4] hover:bg-[#0891b2] active:bg-[#0e7490] transition-all shadow-md shadow-cyan-500/30 flex items-center justify-center gap-2 mt-4',
                  loading && 'opacity-70 cursor-not-allowed'
                )}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    <span>Ingresando...</span>
                  </>
                ) : 'Ingresar'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}