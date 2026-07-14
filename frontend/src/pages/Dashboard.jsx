import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, Thermometer, CalendarX2,
  LayoutGrid, ArrowRight, Sunrise, Sun, Moon,
  MapPin, Droplets,
} from 'lucide-react'
import api, { odoo } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/utils'
import { CardSkeleton, Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { useCountUp } from '../hooks/useCountUp'

/* ── Constantes ─────────────────────────────────────────────── */
const MOMENTOS = [
  { key: 'manana', label: 'Mañana', Icon: Sunrise, range: [0, 11],  color: 'text-amber-500' },
  { key: 'tarde',  label: 'Tarde',  Icon: Sun,     range: [12, 17], color: 'text-orange-500' },
  { key: 'noche',  label: 'Noche',  Icon: Moon,    range: [18, 23], color: 'text-brand-400' },
]

function getHour(horaStr) {
  return parseInt((horaStr ?? '00').slice(0, 2), 10)
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function todayInDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

/* ── KPI Card ────────────────────────────────────────────────── */
const KPI_STYLES = {
  ok:      { card: 'border-ok-200 bg-ok-50',        num: 'text-ok-700',      icon: 'bg-ok-100 text-ok-600' },
  warn:    { card: 'border-warn-200 bg-warn-50',     num: 'text-warn-700',    icon: 'bg-warn-100 text-warn-600' },
  danger:  { card: 'border-danger-200 bg-danger-50', num: 'text-danger-700',  icon: 'bg-danger-100 text-danger-600' },
  neutral: { card: 'border-surface-200 bg-white',    num: 'text-surface-900', icon: 'bg-surface-100 text-surface-500' },
}

function KpiCard({ label, value, suffix = '', sublabel, variant = 'neutral', icon: Icon, loading, delay = 0 }) {
  if (loading) return <CardSkeleton />
  const s = KPI_STYLES[variant]
  const numericTarget = typeof value === 'number' ? value : null
  const counted = useCountUp(numericTarget ?? 0, 600)
  const display = numericTarget !== null ? `${counted}${suffix}` : (value ?? '—')

  return (
    <div
      className={cn(
        'card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-cardMd animate-fade-in',
        s.card,
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3 shrink-0', s.icon)}>
        <Icon size={17} />
      </div>
      <p className={cn('text-3xl font-bold tabular', s.num)}>{display}</p>
      <p className="text-sm font-medium text-surface-700 mt-1">{label}</p>
      {sublabel && <p className="text-xs text-surface-400 mt-0.5">{sublabel}</p>}
    </div>
  )
}

/* ── Celda de estado de área ─────────────────────────────────── */
function StatusCell({ registro }) {
  if (!registro) {
    return (
      <div className="w-20 h-10 rounded-lg border-2 border-dashed border-surface-200 flex items-center justify-center">
        <span className="text-xs text-surface-300">—</span>
      </div>
    )
  }
  return (
    <div className={cn(
      'w-20 h-10 rounded-lg border flex flex-col items-center justify-center gap-0',
      registro.alerta ? 'bg-danger-50 border-danger-200' : 'bg-ok-50 border-ok-200',
    )}>
      {registro.alerta && <AlertTriangle size={9} className="text-danger-400" />}
      <span className={cn(
        'text-sm font-bold tabular leading-none',
        registro.alerta ? 'text-danger-700' : 'text-ok-700',
      )}>
        {registro.temperatura}°
      </span>
      {registro.humedad != null && (
        <span className="flex items-center gap-0.5 text-2xs font-medium text-brand-600 leading-none mt-0.5">
          <Droplets size={8} />{registro.humedad}%
        </span>
      )}
    </div>
  )
}

/* ── Dashboard principal ─────────────────────────────────────── */
export default function Dashboard() {
  const { user, isAdmin, sedesPermitidas } = useAuth()

  const [sedes, setSedes]               = useState([])
  const [sedeId, setSedeId]             = useState('')
  const [areas, setAreas]               = useState([])
  const [registros, setRegistros]       = useState([])
  const [vencCriticos, setVencCriticos] = useState(undefined)
  const [loadingKpi, setLoadingKpi]     = useState(true)
  const [loadingGrid, setLoadingGrid]   = useState(false)

  useEffect(() => {
    api.get('/sedes')
      .then(r => {
        const visibles = r.data.filter(s => isAdmin || sedesPermitidas.includes(s.id))
        setSedes(visibles)
        if (visibles.length > 0) setSedeId(String(visibles[0].id))
        else setLoadingKpi(false)
      })
      .catch(() => setLoadingKpi(false))
  }, [isAdmin, sedesPermitidas])

  const loadSedeData = useCallback(async () => {
    if (!sedeId) return
    setLoadingGrid(true)
    try {
      const today = todayStr()
      const [areasRes, regRes] = await Promise.all([
        api.get(`/sedes/${sedeId}/areas`),
        api.get('/temperaturas', { params: { sede_id: sedeId, fecha_inicio: today, fecha_fin: today } }),
      ])
      setAreas(areasRes.data)
      setRegistros(regRes.data)
    } catch {
      setAreas([])
      setRegistros([])
    } finally {
      setLoadingGrid(false)
      setLoadingKpi(false)
    }
  }, [sedeId])

  useEffect(() => { loadSedeData() }, [loadSedeData])

  useEffect(() => {
    odoo.getVencimientos({ fecha_hasta: todayInDays(30) })
      .then(r => setVencCriticos(r.data.filter(v => v.dias !== null && v.dias < 30).length))
      .catch(() => setVencCriticos(null))
  }, [])

  const alertasHoy   = registros.filter(r => r.alerta).length
  const areasActivas = areas.length
  const totalPosible = areas.length * 3
  const completitud  = totalPosible > 0 ? Math.round((registros.length / totalPosible) * 100) : 0

  const kpiAlertaVariant  = alertasHoy > 0 ? 'danger' : 'ok'
  const kpiCompletVariant = completitud === 100 ? 'ok' : completitud >= 50 ? 'warn' : 'neutral'
  const kpiVencVariant    = vencCriticos == null ? 'neutral' : vencCriticos > 0 ? 'warn' : 'ok'

  const alertasRecientes = registros.filter(r => r.alerta).slice(0, 6)

  function getRegistro(areaId, momentoKey) {
    const m = MOMENTOS.find(x => x.key === momentoKey)
    return registros.find(r => {
      const h = getHour(r.hora)
      return r.area_id === areaId && h >= m.range[0] && h <= m.range[1]
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Saludo + selector de sede ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-surface-900">
            {greeting()}{user?.nombre ? `, ${user.nombre.split(' ')[0]}` : ''}
          </h2>
          <p className="text-sm text-surface-400 mt-0.5 capitalize">
            {new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
          </p>
        </div>
        {sedes.length > 1 && (
          <select value={sedeId} onChange={e => setSedeId(e.target.value)} className="input-base w-auto">
            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}
        {sedes.length === 1 && (
          <span className="badge badge-brand text-sm px-3 py-1">{sedes[0]?.nombre}</span>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          loading={loadingKpi}
          label="Alertas hoy"
          value={alertasHoy}
          sublabel={alertasHoy > 0 ? 'Temperaturas fuera de rango' : 'Todo en rango normal'}
          variant={kpiAlertaVariant}
          icon={AlertTriangle}
          delay={0}
        />
        <KpiCard
          loading={loadingKpi}
          label="Áreas activas"
          value={areasActivas}
          sublabel="Equipos configurados"
          variant="neutral"
          icon={LayoutGrid}
          delay={60}
        />
        <KpiCard
          loading={loadingKpi}
          label="Completitud"
          value={completitud}
          suffix="%"
          sublabel={`${registros.length} de ${totalPosible} registros hoy`}
          variant={kpiCompletVariant}
          icon={Thermometer}
          delay={120}
        />
        <KpiCard
          loading={vencCriticos === undefined}
          label="Vencimientos"
          value={typeof vencCriticos === 'number' ? vencCriticos : null}
          sublabel={vencCriticos == null ? 'Odoo no conectado' : 'Lotes con ≤ 30 días'}
          variant={kpiVencVariant}
          icon={CalendarX2}
          delay={180}
        />
      </div>

      {/* ── Grid de estado de áreas ── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <h3 className="text-sm font-semibold text-surface-800">Estado de áreas — hoy</h3>
          <Link
            to="/temperaturas"
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors"
          >
            Ver detalle <ArrowRight size={13} />
          </Link>
        </div>

        {loadingGrid ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 items-center" style={{ opacity: 1 - (i - 1) * 0.25 }}>
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-20" />
              </div>
            ))}
          </div>
        ) : areas.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="Sin áreas configuradas"
            description="Esta sede no tiene áreas activas."
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50">
                  <th className="text-left text-xs font-medium text-surface-400 uppercase tracking-wider px-5 py-3 w-36">
                    Área
                  </th>
                  {MOMENTOS.map(({ key, label, Icon, color }) => (
                    <th key={key} className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-surface-400 uppercase tracking-wider">
                        <Icon size={12} className={color} />
                        {label}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {areas.map(area => (
                  <tr key={area.id} className="hover:bg-surface-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <span className="text-sm font-medium text-surface-700">{area.nombre}</span>
                      {area.tipo === 'ambiente' && (
                        <span className="ml-2 text-xs text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-md font-medium">amb</span>
                      )}
                    </td>
                    {MOMENTOS.map(momento => (
                      <td key={momento.key} className="px-3 py-3 text-center">
                        <div className="flex justify-center">
                          <StatusCell registro={getRegistro(area.id, momento.key)} />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Alertas recientes ── */}
      {alertasRecientes.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2">
            <AlertTriangle size={15} className="text-danger-500" />
            <h3 className="text-sm font-semibold text-surface-800">Alertas activas hoy</h3>
            <span className="badge badge-danger ml-auto">{alertasRecientes.length}</span>
          </div>
          <ul className="divide-y divide-surface-100">
            {alertasRecientes.map(r => {
              const h = getHour(r.hora)
              const momento = h < 12 ? 'Mañana' : h < 18 ? 'Tarde' : 'Noche'
              return (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="status-dot status-dot-danger" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-surface-800 truncate">{r.area_nombre}</span>
                    <span className="text-xs text-surface-400 ml-2">{momento}</span>
                  </div>
                  <span className="text-sm font-bold text-danger-700 tabular shrink-0">
                    {r.temperatura}°C
                  </span>
                </li>
              )
            })}
          </ul>
          <div className="px-5 py-3 border-t border-surface-100">
            <Link to="/temperaturas" className="text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors flex items-center gap-1">
              Ir al registro completo <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
