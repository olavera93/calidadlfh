import React, { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader } from 'lucide-react'
import { odoo } from '../../services/api'

const INITIAL = { url: '', database: '', username: '', password: '' }

export default function OdooConfiguracion() {
  const [form, setForm] = useState(INITIAL)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    odoo.getSettings()
      .then(res => {
        const s = res.data
        setForm({ url: s.url ?? '', database: s.database ?? '', username: s.username ?? '', password: '' })
        setLoaded(true)
      })
      .catch(err => {
        if (err.response?.status !== 404) {
          setSaveMsg({ ok: false, text: 'No se pudo cargar la configuración actual.' })
        }
        setLoaded(true)
      })
  }, [])

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setSaveMsg(null)
    setTestResult(null)
  }

  const esEdicion = loaded && !!form.url

  async function guardar(e) {
    e.preventDefault()
    const passwordRequerida = !esEdicion
    if (!form.url || !form.database || !form.username || (passwordRequerida && !form.password)) {
      setSaveMsg({ ok: false, text: 'URL, base de datos y usuario son obligatorios.' })
      return
    }
    setSaving(true)
    setSaveMsg(null)
    try {
      await odoo.saveSettings(form)
      setSaveMsg({ ok: true, text: 'Configuración guardada correctamente.' })
      setForm(prev => ({ ...prev, password: '' }))
    } catch (err) {
      setSaveMsg({ ok: false, text: err.response?.data?.detail ?? 'Error al guardar.' })
    } finally {
      setSaving(false)
    }
  }

  async function probar() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await odoo.testConnection()
      setTestResult(res.data)
    } catch (err) {
      setTestResult({ ok: false, mensaje: err.response?.data?.detail ?? 'Error de conexión.' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Configuración Odoo</h1>
        <p className="text-sm text-gray-500 mt-0.5">Credenciales de conexión al servidor Odoo</p>
      </div>

      <form onSubmit={guardar} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL del servidor</label>
          <input
            type="url"
            name="url"
            value={form.url}
            onChange={handleChange}
            placeholder="https://miempresa.odoo.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Base de datos</label>
          <input
            type="text"
            name="database"
            value={form.database}
            onChange={handleChange}
            placeholder="nombre_db"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="admin@empresa.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña / API Key
            {loaded && form.url && <span className="ml-1 text-xs text-gray-400">(dejar en blanco para mantener la actual)</span>}
          </label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {saveMsg && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
            saveMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {saveMsg.ok ? <CheckCircle size={15} /> : <XCircle size={15} />}
            {saveMsg.text}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={saving || testing}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={probar}
            disabled={testing || saving}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            {testing && <Loader size={14} className="animate-spin" />}
            {testing ? 'Probando…' : 'Probar conexión'}
          </button>
        </div>
      </form>

      {testResult && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${
          testResult.ok
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {testResult.ok
            ? <CheckCircle size={18} className="shrink-0 mt-0.5" />
            : <XCircle size={18} className="shrink-0 mt-0.5" />}
          <div>
            <p className="font-medium">{testResult.ok ? 'Conexión exitosa' : 'Error de conexión'}</p>
            <p className="mt-0.5 text-xs opacity-80">{testResult.mensaje}</p>
            {testResult.uid && (
              <p className="mt-0.5 text-xs opacity-60">UID: {testResult.uid}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
