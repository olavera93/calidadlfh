import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronLeft, ChevronRight, Calendar,
  Sunrise, Sun, Moon,
  AlertTriangle, Plus, X, Droplets, Thermometer, Pencil, MapPin,
} from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'
import { EmptyState } from '../../components/ui/EmptyState'

const MOMENTOS = [
  { key: 'manana', label: 'Mañana', Icon: Sunrise, range: [0, 11],  defaultHora: '08:00:00', color: 'text-amber-500' },
  { key: 'tarde',  label: 'Tarde',  Icon: Sun,     range: [12, 17], defaultHora: '14:00:00', color: 'text-orange-500' },
  { key: 'noche',  label: 'Noche',  Icon: Moon,    range: [18, 23], defaultHora: '20:00:00', color: 'text-brand-400' },
]

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function shiftDay(dateStr, delta) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + delta)
  return dt.toISOString().split('T')[0]
}

function formatDisplay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatShort(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function getHour(horaStr) {
  return parseInt((horaStr ?? '00').slice(0, 2), 10)
}

/* ── Modal de registro / edición ─────────────────────────────── */
function RegistroModal({ area, momento, dateStr, registro = null, onClose, onSaved }) {
  const isEdit = registro != null
  const [temp, setTemp]       = useState(isEdit ? String(registro.temperatura) : '')
  const [humedad, setHumedad] = useState(isEdit && registro.humedad != null ? String(registro.humedad) : '')
  const [obs, setObs]         = useState(isEdit ? (registro.observaciones ?? '') : '')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const tempRef = useRef(null)

  const esAmbiente = area.tipo === 'ambiente'

  useEffect(() => { tempRef.current?.focus() }, [])

  const canSave = temp !== '' && obs.trim() !== '' && (!esAmbiente || humedad !== '')

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        await api.patch(`/temperaturas/${registro.id}`, {
          temperatura: Number(temp),
          humedad: esAmbiente && humedad !== '' ? Number(humedad) : null,
          observaciones: obs,
        })
      } else {
        await api.post('/temperaturas', {
          area_id: area.id,
          temperatura: Number(temp),
          humedad: esAmbiente && humedad !== '' ? Number(humedad) : null,
          fecha: dateStr,
          hora: momento.defaultHora,
          observaciones: obs,
        })
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar')
      setSaving(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') onClose()
    if (e.key === 'Enter' && !e.shiftKey && canSave) handleSave()
  }

  const Icon = momento.Icon

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-modal w-full max-w-sm flex flex-col animate-scale-in"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-surface-100">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Icon size={15} className={momento.color} />
              <span className="font-semibold text-surface-800">{momento.label}</span>
              {isEdit && (
                <span className="badge badge-warn">Editando</span>
              )}
            </div>
            <p className="text-sm text-surface-500">{area.nombre}</p>
            <p className="text-xs text-surface-400 mt-0.5 capitalize">{formatShort(dateStr)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-surface-700 hover:bg-surface-100 rounded-lg p-1.5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Temperatura */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-surface-600 mb-1.5">
              <Thermometer size={13} className="text-surface-400" />
              Temperatura
            </label>
            <div className="relative">
              <input
                ref={tempRef}
                type="number"
                step="0.1"
                placeholder="0.0"
                value={temp}
                onChange={e => setTemp(e.target.value)}
                className="input-base pr-12 tabular"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-surface-400">°C</span>
            </div>
            {area.temp_min != null && area.temp_max != null && (
              <p className="text-xs text-surface-400 mt-1">
                Rango permitido: {area.temp_min}°C – {area.temp_max}°C
              </p>
            )}
          </div>

          {/* Humedad (solo ambiente) */}
          {esAmbiente && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-surface-600 mb-1.5">
                <Droplets size={13} className="text-brand-500" />
                Humedad relativa
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="0.0"
                  value={humedad}
                  onChange={e => setHumedad(e.target.value)}
                  className="input-base pr-12 tabular"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-surface-400">%</span>
              </div>
              {area.humedad_min != null && area.humedad_max != null && (
                <p className="text-xs text-surface-400 mt-1">
                  Rango: {area.humedad_min}% – {area.humedad_max}%
                </p>
              )}
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1.5">
              Observaciones
            </label>
            <textarea
              rows={2}
              placeholder="Condiciones del equipo, incidencias..."
              value={obs}
              onChange={e => setObs(e.target.value)}
              className="input-base resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-danger-700 bg-danger-50 border border-danger-200 rounded-xl px-3 py-2.5">
              <AlertTriangle size={14} className="shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 pb-5">
          <button onClick={onClose} className="btn btn-md btn-secondary flex-1">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="btn btn-md btn-primary flex-1"
          >
            {saving ? 'Guardando…' : isEdit ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Vista principal ──────────────────────────────────────────── */
export default function DayView({ sedeId, areas }) {
  const { isAdmin } = useAuth()
  const [dateStr, setDateStr] = useState(todayStr())
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)

  const loadRegistros = useCallback(async () => {
    if (!sedeId) { setRegistros([]); return }
    setLoading(true)
    try {
      const r = await api.get('/temperaturas', {
        params: { sede_id: sedeId, fecha_inicio: dateStr, fecha_fin: dateStr },
      })
      setRegistros(r.data)
    } catch {
      setRegistros([])
    } finally {
      setLoading(false)
    }
  }, [sedeId, dateStr])

  useEffect(() => { loadRegistros() }, [loadRegistros])

  function getRegistro(areaId, momentoKey) {
    const m = MOMENTOS.find(x => x.key === momentoKey)
    return registros.find(r => {
      const h = getHour(r.hora)
      return r.area_id === areaId && h >= m.range[0] && h <= m.range[1]
    })
  }

  const isToday = dateStr === todayStr()

  if (!sedeId) {
    return (
      <div className="card">
        <EmptyState
          icon={MapPin}
          title="Selecciona una sede"
          description="Elige una sede del selector superior para ver el registro del día."
        />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Navegación por día */}
        <div className="card px-5 py-3 flex items-center justify-between">
          <button
            onClick={() => setDateStr(shiftDay(dateStr, -1))}
            className="p-2 rounded-xl hover:bg-surface-100 transition-colors"
          >
            <ChevronLeft size={18} className="text-surface-500" />
          </button>

          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-surface-800 capitalize select-none">
              {formatDisplay(dateStr)}
            </span>
            {isToday && (
              <span className="badge badge-brand">Hoy</span>
            )}
            <label className="relative cursor-pointer text-surface-400 hover:text-brand-500 transition-colors" title="Ir a fecha">
              <Calendar size={16} />
              <input
                type="date"
                value={dateStr}
                onChange={e => e.target.value && setDateStr(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>

          <button
            onClick={() => setDateStr(shiftDay(dateStr, 1))}
            className="p-2 rounded-xl hover:bg-surface-100 transition-colors"
          >
            <ChevronRight size={18} className="text-surface-500" />
          </button>
        </div>

        {/* Grid áreas × momentos */}
        {areas.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Thermometer}
              title={loading ? 'Cargando…' : 'Sin áreas configuradas'}
              description={loading ? undefined : 'Esta sede no tiene áreas activas. Configúralas en la pestaña Configuración.'}
            />
          </div>
        ) : (
          <div className="card overflow-hidden">
            {loading && (
              <div className="text-center py-1.5 text-xs text-brand-600 bg-brand-50 border-b border-brand-100">
                Actualizando…
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-100">
                    <th className="text-left text-xs font-medium text-surface-400 uppercase tracking-wider px-6 py-3 bg-surface-50 w-40">
                      Área
                    </th>
                    {MOMENTOS.map(({ key, label, Icon, color }) => (
                      <th key={key} className="bg-surface-50 px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-surface-400 uppercase tracking-wider">
                          <Icon size={13} className={color} />
                          {label}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {areas.map(area => (
                    <tr key={area.id} className="hover:bg-surface-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-surface-700">{area.nombre}</span>
                        {area.tipo === 'ambiente' && (
                          <span className="ml-2 text-xs text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-md font-medium">amb</span>
                        )}
                      </td>
                      {MOMENTOS.map(momento => {
                        const registro = getRegistro(area.id, momento.key)
                        return (
                          <td key={momento.key} className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center h-16">
                              {registro ? (
                                <div className="relative group/card">
                                  {/* Tarjeta de registro */}
                                  <div
                                    onClick={() => isAdmin && setModal({ area, momento, registro })}
                                    className={cn(
                                      'flex flex-col items-center justify-center gap-0.5 w-24 h-14 rounded-xl border select-none',
                                      isAdmin ? 'cursor-pointer hover:shadow-cardMd transition-shadow' : 'cursor-default',
                                      registro.alerta
                                        ? 'bg-danger-50 border-danger-200'
                                        : 'bg-ok-50 border-ok-200',
                                    )}
                                  >
                                    {registro.alerta && (
                                      <AlertTriangle size={11} className="text-danger-400" />
                                    )}
                                    <span className={cn(
                                      'text-xl font-bold leading-none tabular',
                                      registro.alerta ? 'text-danger-700' : 'text-ok-700',
                                    )}>
                                      {registro.temperatura}°
                                    </span>
                                    {registro.humedad != null && (
                                      <span className="flex items-center gap-0.5 text-xs font-semibold text-brand-600">
                                        <Droplets size={10} />{registro.humedad}%
                                      </span>
                                    )}
                                  </div>

                                  {/* Ícono editar (solo admin) */}
                                  {isAdmin && (
                                    <div className="absolute -top-1.5 -right-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none">
                                      <div className="bg-white border border-brand-200 rounded-md p-0.5 shadow-card">
                                        <Pencil size={10} className="text-brand-500" />
                                      </div>
                                    </div>
                                  )}

                                  {/* Tooltip hover */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-50
                                                  opacity-0 group-hover/card:opacity-100 pointer-events-none
                                                  transition-opacity duration-150">
                                    <div className="bg-surface-900 text-white rounded-xl px-3 py-2.5 text-xs w-44 shadow-modal">
                                      <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                          <span className="text-surface-400">Hora</span>
                                          <span className="font-mono font-medium">{String(registro.hora).slice(0, 5)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <span className="text-surface-400">Responsable</span>
                                          <span className="font-medium truncate ml-2">{registro.usuario_nombre}</span>
                                        </div>
                                        {registro.observaciones && (
                                          <div className="border-t border-surface-700 pt-1.5">
                                            <span className="text-surface-400 block mb-0.5">Obs.</span>
                                            <span className="leading-snug text-surface-200">{registro.observaciones}</span>
                                          </div>
                                        )}
                                        {registro.alerta && (
                                          <div className="flex items-center gap-1 border-t border-surface-700 pt-1.5 text-danger-400 font-medium">
                                            <AlertTriangle size={10} /> Fuera de rango
                                          </div>
                                        )}
                                      </div>
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-900" />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setModal({ area, momento })}
                                  className="w-10 h-10 rounded-full border-2 border-dashed border-surface-300 flex items-center justify-center text-surface-400 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
                                  title={`Registrar ${momento.label}`}
                                >
                                  <Plus size={17} />
                                </button>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <RegistroModal
          area={modal.area}
          momento={modal.momento}
          dateStr={dateStr}
          registro={modal.registro ?? null}
          onClose={() => setModal(null)}
          onSaved={async () => { setModal(null); await loadRegistros() }}
        />
      )}
    </>
  )
}
