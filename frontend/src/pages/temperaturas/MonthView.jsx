import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Thermometer, MapPin, Calendar, FileDown } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ReferenceArea, ResponsiveContainer,
} from 'recharts'
import api from '../../services/api'
import { cn } from '../../lib/utils'
import { EmptyState } from '../../components/ui/EmptyState'
import { captureChartAsBase64 } from '../../hooks/useChartCapture'

/* ── Paleta de momentos ─────────────────────────────────────── */
const MOMENTO_COLORS = {
  Mañana: '#f59e0b',  // amber
  Tarde:  '#f97316',  // orange
  Noche:  '#06b6d4',  // brand/cyan
}

const MOMENTO_BADGE_CLASS = {
  Mañana: 'bg-amber-100 text-amber-700',
  Tarde:  'bg-orange-100 text-orange-700',
  Noche:  'bg-brand-100 text-brand-700',
}

/* ── Helpers de fecha ───────────────────────────────────────── */
function currentYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number)
  return {
    firstDay: `${ym}-01`,
    lastDay:  new Date(y, m, 0).toISOString().split('T')[0],
  }
}

function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const dt = new Date(y, m - 1 + delta, 1)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}

function formatMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
}

function getHour(horaStr) {
  return parseInt((horaStr ?? '00').slice(0, 2), 10)
}

function getMomentoLabel(horaStr) {
  const h = getHour(horaStr)
  if (h < 12) return 'Mañana'
  if (h < 18) return 'Tarde'
  return 'Noche'
}

function formatShortDate(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

/* ── Leyenda fija Mañana → Tarde → Noche ───────────────────── */
const ORDEN_LEYENDA = ['Mañana', 'Tarde', 'Noche']
function ChartLegend() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, paddingTop: 12, fontSize: 12, color: '#64748b' }}>
      {ORDEN_LEYENDA.map(m => (
        <span key={m} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: MOMENTO_COLORS[m], flexShrink: 0 }} />
          {m}
        </span>
      ))}
    </div>
  )
}

/* ── Tooltip custom del chart ───────────────────────────────── */
function ChartTooltip({ active, payload, label, unit = '°C' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-900 text-white rounded-xl px-3 py-2.5 text-xs shadow-modal border border-surface-700">
      <p className="text-surface-400 mb-2 font-medium">Día {label}</p>
      <div className="space-y-1">
        {payload.map(p => (
          <div key={p.name} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
              <span className="text-surface-300">{p.name}</span>
            </span>
            <span className="font-semibold tabular">{p.value}{unit}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Gráfico de temperatura ─────────────────────────────────── */
function TempChart({ data, area, yearMonth }) {
  if (!data.length) return (
    <div className="card">
      <EmptyState
        icon={Thermometer}
        title={`Sin registros — ${area.nombre}`}
        description={`No hay datos para ${formatMonth(yearMonth)}.`}
      />
    </div>
  )

  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-surface-700 mb-4">
        {area.nombre}
        <span className="font-normal text-surface-400 ml-2 capitalize">— temperatura · {formatMonth(yearMonth)}</span>
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 20, bottom: 0, left: -12 }}>
          <defs>
            {/* Zona segura entre min y max */}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={d => `${d}`}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            unit="°"
          />
          <Tooltip content={<ChartTooltip unit="°C" />} />
          <Legend content={<ChartLegend />} />

          {/* Banda verde de zona segura */}
          {area.temp_min != null && area.temp_max != null && (
            <ReferenceArea
              y1={area.temp_min}
              y2={area.temp_max}
              fill="#22c55e"
              fillOpacity={0.07}
              stroke="none"
            />
          )}

          {/* Líneas de referencia */}
          {area.temp_min != null && (
            <ReferenceLine
              y={area.temp_min}
              stroke="#22c55e"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: `${area.temp_min}°`, fontSize: 10, fill: '#16a34a', position: 'insideTopLeft' }}
            />
          )}
          {area.temp_max != null && (
            <ReferenceLine
              y={area.temp_max}
              stroke="#f43f5e"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: `${area.temp_max}°`, fontSize: 10, fill: '#e11d48', position: 'insideTopLeft' }}
            />
          )}

          {['Mañana', 'Tarde', 'Noche'].map(m => (
            <Line
              key={m}
              type="monotoneX"
              dataKey={m}
              stroke={MOMENTO_COLORS[m]}
              strokeWidth={2}
              dot={{ r: 3, fill: MOMENTO_COLORS[m], strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── Gráfico de humedad ─────────────────────────────────────── */
function HumChart({ data, area, yearMonth }) {
  if (!data.length) return null
  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-surface-700 mb-4">
        {area.nombre}
        <span className="font-normal text-surface-400 ml-2 capitalize">— humedad relativa · {formatMonth(yearMonth)}</span>
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 20, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            unit="%"
            domain={[0, 100]}
          />
          <Tooltip content={<ChartTooltip unit="%" />} />
          <Legend content={<ChartLegend />} />

          {area.humedad_min != null && area.humedad_max != null && (
            <ReferenceArea y1={area.humedad_min} y2={area.humedad_max} fill="#06b6d4" fillOpacity={0.07} stroke="none" />
          )}
          {area.humedad_min != null && (
            <ReferenceLine
              y={area.humedad_min} stroke="#0891b2" strokeDasharray="4 3" strokeWidth={1.5}
              label={{ value: `${area.humedad_min}%`, fontSize: 10, fill: '#0891b2', position: 'insideTopLeft' }}
            />
          )}
          {area.humedad_max != null && (
            <ReferenceLine
              y={area.humedad_max} stroke="#f43f5e" strokeDasharray="4 3" strokeWidth={1.5}
              label={{ value: `${area.humedad_max}%`, fontSize: 10, fill: '#e11d48', position: 'insideTopLeft' }}
            />
          )}
          {['Mañana', 'Tarde', 'Noche'].map(m => (
            <Line key={m} type="monotoneX" dataKey={m} stroke={MOMENTO_COLORS[m]} strokeWidth={2}
              dot={{ r: 3, fill: MOMENTO_COLORS[m], strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── Vista principal ────────────────────────────────────────── */
export default function MonthView({ sedeId, areas }) {
  const [yearMonth, setYearMonth] = useState(currentYearMonth())
  const [areaId, setAreaId]       = useState('')
  const [registros, setRegistros] = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [exporting, setExporting] = useState(false)

  const tempChartRef = useRef(null)
  const humChartRef  = useRef(null)

  const loadRegistros = useCallback(async () => {
    if (!sedeId) { setRegistros([]); return }
    const { firstDay, lastDay } = monthRange(yearMonth)
    setLoading(true)
    setError('')
    try {
      const params = { sede_id: sedeId, fecha_inicio: firstDay, fecha_fin: lastDay }
      if (areaId) params.area_id = areaId
      const r = await api.get('/temperaturas', { params })
      setRegistros(r.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cargar el historial')
    } finally {
      setLoading(false)
    }
  }, [sedeId, yearMonth, areaId])

  useEffect(() => { loadRegistros() }, [loadRegistros])

  const selectedArea = areas.find(a => String(a.id) === String(areaId))

  const chartData = useMemo(() => {
    if (!selectedArea) return []
    const byDay = {}
    registros
      .filter(r => r.area_id === selectedArea.id)
      .forEach(r => {
        const day = parseInt(r.fecha.split('-')[2], 10)
        const m = getMomentoLabel(r.hora)
        // Inicializar con claves en orden fijo para que Recharts respete Mañana → Tarde → Noche
        if (!byDay[day]) byDay[day] = { day, 'Mañana': undefined, 'Tarde': undefined, 'Noche': undefined }
        byDay[day][m] = r.temperatura
      })
    return Object.values(byDay).sort((a, b) => a.day - b.day)
  }, [registros, selectedArea])

  const humChartData = useMemo(() => {
    if (!selectedArea || selectedArea.tipo !== 'ambiente') return []
    const byDay = {}
    registros
      .filter(r => r.area_id === selectedArea.id && r.humedad != null)
      .forEach(r => {
        const day = parseInt(r.fecha.split('-')[2], 10)
        const m = getMomentoLabel(r.hora)
        if (!byDay[day]) byDay[day] = { day, 'Mañana': undefined, 'Tarde': undefined, 'Noche': undefined }
        byDay[day][m] = r.humedad
      })
    return Object.values(byDay).sort((a, b) => a.day - b.day)
  }, [registros, selectedArea])

  const sortedRegistros = useMemo(
    () => [...registros].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora)),
    [registros]
  )

  const handleExportPdf = useCallback(async () => {
    if (!selectedArea) return
    setExporting(true)
    setError('')
    try {
      const tempImg = await captureChartAsBase64(tempChartRef)
      const humImg = humChartData.length ? await captureChartAsBase64(humChartRef) : null

      const payload = {
        area_id: selectedArea.id,
        area_nombre: selectedArea.nombre,
        year_month: yearMonth,
        temp_chart_base64: tempImg,
        hum_chart_base64: humImg,
        registros: sortedRegistros.filter(r => r.area_id === selectedArea.id),
      }

      const res = await api.post('/temperaturas/reporte-mes', payload, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `temperaturas_${selectedArea.nombre}_${yearMonth}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al generar el PDF')
    } finally {
      setExporting(false)
    }
  }, [selectedArea, yearMonth, humChartData, sortedRegistros])

  if (!sedeId) {
    return (
      <div className="card">
        <EmptyState icon={MapPin} title="Selecciona una sede" description="Elige una sede para ver el historial del mes." />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controles mes + área */}
      <div className="card px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => setYearMonth(shiftMonth(yearMonth, -1))} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors">
            <ChevronLeft size={17} className="text-surface-500" />
          </button>
          <span className="text-sm font-semibold text-surface-800 capitalize px-2 select-none">
            {formatMonth(yearMonth)}
          </span>
          <button onClick={() => setYearMonth(shiftMonth(yearMonth, 1))} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors">
            <ChevronRight size={17} className="text-surface-500" />
          </button>
          <label className="relative cursor-pointer text-surface-400 hover:text-brand-500 transition-colors p-1.5 rounded-lg hover:bg-surface-100" title="Seleccionar mes">
            <Calendar size={16} />
            <input
              type="month"
              value={yearMonth}
              onChange={e => e.target.value && setYearMonth(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
        </div>
        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-brand-500">Cargando…</span>}
          <select
            value={areaId}
            onChange={e => setAreaId(e.target.value)}
            className="input-base w-auto"
          >
            <option value="">Todas las áreas</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          {selectedArea && (
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="btn-secondary flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar PDF del mes"
            >
              <FileDown size={15} />
              {exporting ? 'Generando…' : 'Exportar PDF'}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      {/* Aviso para seleccionar área específica */}
      {!selectedArea && registros.length > 0 && (
        <div className="bg-warn-50 border border-warn-200 rounded-xl px-4 py-3 text-sm text-warn-700">
          Selecciona un área específica para ver el gráfico de temperaturas.
        </div>
      )}

      {/* Gráficos */}
      {selectedArea && (
        <>
          <div ref={tempChartRef}>
            <TempChart data={chartData} area={selectedArea} yearMonth={yearMonth} />
          </div>
          {humChartData.length > 0 && (
            <div ref={humChartRef}>
              <HumChart data={humChartData} area={selectedArea} yearMonth={yearMonth} />
            </div>
          )}
        </>
      )}

      {/* Tabla historial */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-surface-700">
            Registros del mes
            {registros.length > 0 && (
              <span className="ml-2 font-normal text-surface-400">({registros.length})</span>
            )}
          </h3>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          {sortedRegistros.length === 0 && !loading ? (
            <EmptyState icon={Thermometer} title="Sin registros en este período" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50 text-xs text-surface-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Hora</th>
                  <th className="text-left px-4 py-3">Momento</th>
                  <th className="text-left px-4 py-3">Área</th>
                  <th className="text-right px-4 py-3">Temp</th>
                  <th className="text-right px-4 py-3">Humedad</th>
                  <th className="text-left px-4 py-3">Responsable</th>
                  <th className="text-left px-4 py-3">Observaciones</th>
                  <th className="text-center px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {sortedRegistros.map(r => {
                  const momento = getMomentoLabel(r.hora)
                  return (
                    <tr key={r.id} className="border-b border-surface-100 last:border-0 hover:bg-surface-50 transition-colors">
                      <td className="px-5 py-2.5 whitespace-nowrap text-surface-600">{formatShortDate(r.fecha)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-surface-500 font-mono text-xs tabular">
                        {String(r.hora).slice(0, 5)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn('badge', MOMENTO_BADGE_CLASS[momento])}>{momento}</span>
                      </td>
                      <td className="px-4 py-2.5 text-surface-700">{r.area_nombre}</td>
                      <td className={cn('px-4 py-2.5 text-right font-bold tabular', r.alerta ? 'text-danger-600' : 'text-ok-700')}>
                        {r.temperatura}°C
                      </td>
                      <td className="px-4 py-2.5 text-right text-surface-500 tabular">
                        {r.humedad != null ? `${r.humedad}%` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-surface-500">{r.usuario_nombre}</td>
                      <td className="px-4 py-2.5 text-surface-400 max-w-[180px] truncate">{r.observaciones || '—'}</td>
                      <td className="px-4 py-2.5 text-center">
                        {r.alerta ? (
                          <span className="badge badge-danger"><AlertTriangle size={10} /> Alerta</span>
                        ) : (
                          <span className="badge badge-ok"><CheckCircle size={10} /> OK</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}