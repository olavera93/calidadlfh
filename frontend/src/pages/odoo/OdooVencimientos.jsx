import React, { useState } from 'react'
import { Download, Search, CalendarX2, Filter } from 'lucide-react'
import { odoo } from '../../services/api'
import { cn } from '../../lib/utils'
import { EmptyState } from '../../components/ui/EmptyState'
import { TableSkeleton } from '../../components/ui/Skeleton'

const today = () => new Date().toISOString().slice(0, 10)
const inMonths = (n) => {
  const d = new Date()
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function VencimientoBadge({ dias }) {
  if (dias === null || dias === undefined) return <span className="text-surface-400">—</span>
  if (dias < 0)  return <span className="badge badge-danger">Vencido</span>
  if (dias < 30) return <span className="badge badge-danger">{dias}d</span>
  if (dias < 90) return <span className="badge badge-warn">{dias}d</span>
  return <span className="badge badge-ok">{dias}d</span>
}

const PRESETS = [
  { label: '1 mes',   n: 1 },
  { label: '3 meses', n: 3 },
  { label: '6 meses', n: 6 },
]

export default function OdooVencimientos() {
  const [filtros, setFiltros] = useState({
    fecha_desde: today(),
    fecha_hasta: inMonths(3),
  })
  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [xlsxLoading, setXlsxLoading] = useState(false)

  function handleChange(e) {
    setFiltros(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function buildParams() {
    const p = { fecha_hasta: filtros.fecha_hasta }
    if (filtros.fecha_desde) p.fecha_desde = filtros.fecha_desde
    return p
  }

  async function buscar() {
    if (!filtros.fecha_hasta) return
    setLoading(true)
    setError(null)
    try {
      const res = await odoo.getVencimientos(buildParams())
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Error al consultar Odoo')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  async function exportar() {
    setXlsxLoading(true)
    try {
      const res = await odoo.getVencimientosXlsx(buildParams())
      downloadBlob(res.data, `vencimientos_${today()}.xlsx`)
    } catch { /* silencioso */ }
    finally { setXlsxLoading(false) }
  }

  const criticos = data ? data.filter(r => r.dias !== null && r.dias < 30).length  : 0
  const proximos = data ? data.filter(r => r.dias !== null && r.dias >= 30 && r.dias < 90).length : 0
  const normales = data ? data.filter(r => r.dias === null || r.dias >= 90).length  : 0

  return (
    <div className="space-y-4">
     

      {/* Filtros — todo en una fila compacta */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Fechas */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-surface-500">Desde</label>
            <input
              type="date"
              name="fecha_desde"
              value={filtros.fecha_desde}
              onChange={handleChange}
              className="input-base w-40"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-surface-500">
              Hasta <span className="text-danger-400">*</span>
            </label>
            <input
              type="date"
              name="fecha_hasta"
              value={filtros.fecha_hasta}
              onChange={handleChange}
              className="input-base w-40"
            />
          </div>

          {/* Separador visual */}
          <div className="h-9 w-px bg-surface-200 self-end mb-px hidden sm:block" />

          {/* Presets como chips */}
          <div className="flex items-center gap-1.5 self-end mb-0.5">
            {PRESETS.map(({ label, n }) => (
              <button
                key={n}
                onClick={() => setFiltros({ fecha_desde: today(), fecha_hasta: inMonths(n) })}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Botón consultar */}
          <button
            onClick={buscar}
            disabled={loading || !filtros.fecha_hasta}
            className="btn btn-md btn-primary self-end"
          >
            <Search size={14} />
            {loading ? 'Consultando…' : 'Consultar'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      {/* Sin búsqueda aún */}
      {!loading && data === null && !error && (
        <div className="card">
          <EmptyState
            icon={Filter}
            title="Aplica filtros y presiona Consultar"
            description="Selecciona un rango de fechas para ver los lotes próximos a vencer."
          />
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="card overflow-hidden">
          <TableSkeleton rows={6} cols={6} />
        </div>
      )}

      {/* Resultados */}
      {!loading && data && (
        data.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={CalendarX2}
              title="Sin lotes en este rango"
              description="No hay lotes que venzan entre las fechas seleccionadas."
            />
          </div>
        ) : (
          <div className="card overflow-hidden">
            {/* Barra superior: conteo + stats inline + exportar */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-surface-100 flex-wrap">
              <span className="text-xs text-surface-500 font-medium">
                {data.length} lote{data.length !== 1 ? 's' : ''}
              </span>

              <div className="flex items-center gap-2">
                {criticos > 0 && (
                  <span className="badge badge-danger">
                    {criticos} crítico{criticos !== 1 ? 's' : ''} &lt;30d
                  </span>
                )}
                {proximos > 0 && (
                  <span className="badge badge-warn">
                    {proximos} próximo{proximos !== 1 ? 's' : ''} 30–90d
                  </span>
                )}
                {normales > 0 && (
                  <span className="badge badge-ok">
                    {normales} normal{normales !== 1 ? 'es' : ''} &gt;90d
                  </span>
                )}
              </div>

              <div className="ml-auto">
                <button
                  onClick={exportar}
                  disabled={xlsxLoading}
                  className="btn btn-sm btn-success"
                >
                  <Download size={13} />
                  {xlsxLoading ? 'Exportando…' : 'Exportar Excel'}
                </button>
              </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto scrollbar-thin">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100 bg-surface-50">
                    {['Vencimiento', 'Días', 'Producto', 'Lote', 'Ubicación', 'Cantidad'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-surface-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {data.map((row, i) => (
                    <tr key={i} className="hover:bg-surface-50 transition-colors">
                      <td className="px-3 py-2 whitespace-nowrap tabular text-surface-700">{row.vencimiento}</td>
                      <td className="px-3 py-2 whitespace-nowrap"><VencimientoBadge dias={row.dias} /></td>
                      <td className="px-3 py-2 max-w-[260px] truncate text-surface-800" title={row.producto}>{row.producto}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-surface-600">{row.lote}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate text-surface-500" title={row.ubicacion}>{row.ubicacion}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right tabular text-surface-700">{row.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  )
}
