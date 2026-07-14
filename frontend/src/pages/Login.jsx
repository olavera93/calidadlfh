import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/utils'

const DEV_USERS = [
  { label: 'Admin',       username: 'admin',       password: 'admin123',       className: 'bg-violet-600 hover:bg-violet-700' },
  { label: 'Principal',   username: 'principal',   password: 'principal123',   className: 'bg-sky-600 hover:bg-sky-700' },
  { label: 'Teusaquillo', username: 'teusaquillo', password: 'teusaquillo123', className: 'bg-teal-600 hover:bg-teal-700' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

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
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-brand-700/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-scale-in">
        {/* Card */}
        <div className="card-md p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center mb-4 shadow-cardMd">
              <FlaskConical size={22} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-surface-900">Sistema de Calidad</h1>
            <p className="text-sm text-surface-400 mt-0.5">Farmacéutica</p>
          </div>

          {/* Formulario */}
          <form onSubmit={e => { e.preventDefault(); handleLogin(username, password) }} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                className="input-base"
                placeholder="Nombre de usuario"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-surface-700">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="input-base"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-xl px-3 py-2.5">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn('btn btn-md btn-primary w-full mt-2', loading && 'opacity-60 cursor-not-allowed')}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Ingresando...
                </>
              ) : 'Ingresar'}
            </button>
          </form>

          {/* Acceso rápido dev */}
          {import.meta.env.DEV && (
            <div className="mt-6 pt-5 border-t border-dashed border-surface-200">
              <p className="text-2xs text-surface-400 text-center mb-3 font-mono tracking-wider uppercase">
                acceso rápido · dev
              </p>
              <div className="flex gap-2">
                {DEV_USERS.map(u => (
                  <button
                    key={u.username}
                    onClick={() => handleLogin(u.username, u.password)}
                    disabled={loading}
                    className={cn(
                      'flex-1 text-white text-xs font-medium py-2 rounded-xl transition-colors disabled:opacity-50',
                      u.className,
                    )}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-2xs text-surface-400 mt-4">
          © {new Date().getFullYear()} Sistema de Calidad Farmacéutica
        </p>
      </div>
    </div>
  )
}
